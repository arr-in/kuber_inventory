from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import sys
import logging
from pathlib import Path
import certifi


# Logger must be defined before any handlers use it
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from bson import ObjectId
import shutil
import base64
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection - fail at startup if missing
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME')
if not mongo_url:
    logger.error("MONGO_URL environment variable is required. Set it in .env or your deployment config.")
    sys.exit(1)
if not db_name:
    logger.error("DB_NAME environment variable is required. Set it in .env or your deployment config.")
    sys.exit(1)
db = client[db_name]




# Use certifi for proper SSL/TLS certificate handling
client = AsyncIOMotorClient(
    mongo_url,
    tlscafile=certifi.where(),
    serverSelectionTimeoutMS=30000,
)
db = client[db_name]



# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)

# Create the main app
app = FastAPI()

# Health check endpoint (no auth required)
@app.get("/health")
def health():
    return {"status": "ok"}

api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Models
class AdminCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "admin"

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class AdminResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

class CategoryResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    product_count: int = 0

class ProductCreate(BaseModel):
    name: str
    sku: str
    description: Optional[str] = None
    price: float
    quantity: int
    category: str
    images: List[str] = []
    low_stock_threshold: int = 10

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    quantity: Optional[int] = None
    category: Optional[str] = None
    images: Optional[List[str]] = None
    low_stock_threshold: Optional[int] = None

class ProductResponse(BaseModel):
    id: str
    name: str
    sku: str
    description: Optional[str] = None
    price: float
    quantity: int
    category: str
    images: List[str] = []
    low_stock_threshold: int
    created_at: str
    updated_at: str

class ActivityLog(BaseModel):
    id: str
    product_id: str
    product_name: str
    action: str
    quantity_change: int
    admin_email: str
    timestamp: str

class StatsResponse(BaseModel):
    total_products: int
    total_stock_value: float
    low_stock_items: int
    total_categories: int
    recent_activities: List[Dict[str, Any]]

class ChatRequest(BaseModel):
    message: str

# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        admin = await db.admins.find_one({"email": email}, {"_id": 0})
        if admin is None:
            raise HTTPException(status_code=401, detail="Admin not found")
        return admin
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def log_activity(product_id: str, product_name: str, action: str, quantity_change: int, admin_email: str):
    activity = {
        "id": str(uuid.uuid4()),
        "product_id": product_id,
        "product_name": product_name,
        "action": action,
        "quantity_change": quantity_change,
        "admin_email": admin_email,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.activity_logs.insert_one(activity)

# Auth Endpoints
@api_router.post("/auth/register")
async def register_admin(admin: AdminCreate):
    existing = await db.admins.find_one({"email": admin.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    admin_doc = {
        "id": str(uuid.uuid4()),
        "email": admin.email,
        "password_hash": hash_password(admin.password),
        "name": admin.name,
        "role": admin.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admins.insert_one(admin_doc)
    
    return {"message": "Admin registered successfully", "email": admin.email}

@api_router.post("/auth/login")
async def login(credentials: AdminLogin):
    admin = await db.admins.find_one({"email": credentials.email})
    if not admin or not verify_password(credentials.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({"sub": admin["email"]})
    return {
        "token": token,
        "admin": {
            "id": admin["id"],
            "email": admin["email"],
            "name": admin["name"],
            "role": admin["role"]
        }
    }

@api_router.get("/auth/me")
async def get_current_user(admin: dict = Depends(get_current_admin)):
    return admin

# Category Endpoints
@api_router.post("/categories", response_model=CategoryResponse)
async def create_category(category: CategoryCreate, admin: dict = Depends(get_current_admin)):
    category_doc = {
        "id": str(uuid.uuid4()),
        "name": category.name,
        "description": category.description,
        "product_count": 0
    }
    await db.categories.insert_one(category_doc)
    return CategoryResponse(**category_doc)

@api_router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(admin: dict = Depends(get_current_admin)):
    categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
    for category in categories:
        count = await db.products.count_documents({"category": category["name"]})
        category["product_count"] = count
    return categories

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}

# Product Endpoints
@api_router.post("/products", response_model=ProductResponse)
async def create_product(product: ProductCreate, admin: dict = Depends(get_current_admin)):
    product_doc = {
        "id": str(uuid.uuid4()),
        **product.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.products.insert_one(product_doc)
    await log_activity(product_doc["id"], product_doc["name"], "created", product.quantity, admin["email"])
    return ProductResponse(**product_doc)

@api_router.get("/products", response_model=List[ProductResponse])
async def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    low_stock: Optional[bool] = None,
    admin: dict = Depends(get_current_admin)
):
    query = {}
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"sku": {"$regex": search, "$options": "i"}}
        ]
    if low_stock:
        query["$expr"] = {"$lte": ["$quantity", "$low_stock_threshold"]}
    
    products = await db.products.find(query, {"_id": 0}).to_list(1000)
    return products

@api_router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str, admin: dict = Depends(get_current_admin)):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(product_id: str, product: ProductUpdate, admin: dict = Depends(get_current_admin)):
    existing = await db.products.find_one({"id": product_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = {k: v for k, v in product.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if "quantity" in update_data:
        quantity_change = update_data["quantity"] - existing["quantity"]
        action = "stock_added" if quantity_change > 0 else "stock_reduced"
        await log_activity(product_id, existing["name"], action, quantity_change, admin["email"])
    
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    return updated

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, admin: dict = Depends(get_current_admin)):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    await db.products.delete_one({"id": product_id})
    await log_activity(product_id, product["name"], "deleted", 0, admin["email"])
    return {"message": "Product deleted successfully"}

# Upload Endpoint
@api_router.post("/upload")
async def upload_image(file: UploadFile = File(...), admin: dict = Depends(get_current_admin)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    file_extension = file.filename.split(".")[-1]
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.{file_extension}"
    file_path = UPLOADS_DIR / filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Read and convert to base64
    with open(file_path, "rb") as img_file:
        img_data = base64.b64encode(img_file.read()).decode('utf-8')
        img_url = f"data:{file.content_type};base64,{img_data}"
    
    return {"url": img_url, "filename": filename}

# Stats and Reports
@api_router.get("/stats", response_model=StatsResponse)
async def get_stats(admin: dict = Depends(get_current_admin)):
    products = await db.products.find({}, {"_id": 0}).to_list(10000)
    
    total_products = len(products)
    total_stock_value = sum(p["price"] * p["quantity"] for p in products)
    low_stock_items = len([p for p in products if p["quantity"] <= p.get("low_stock_threshold", 10)])
    total_categories = await db.categories.count_documents({})
    
    activities = await db.activity_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(10).to_list(10)
    
    return StatsResponse(
        total_products=total_products,
        total_stock_value=total_stock_value,
        low_stock_items=low_stock_items,
        total_categories=total_categories,
        recent_activities=activities
    )

@api_router.get("/reports/low-stock")
async def get_low_stock_report(admin: dict = Depends(get_current_admin)):
    products = await db.products.find({}, {"_id": 0}).to_list(10000)
    low_stock = [p for p in products if p["quantity"] <= p.get("low_stock_threshold", 10)]
    return low_stock

@api_router.get("/reports/activity-logs")
async def get_activity_logs(
    limit: int = 100,
    admin: dict = Depends(get_current_admin)
):
    activities = await db.activity_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return activities

@api_router.get("/reports/inventory")
async def get_inventory_report(admin: dict = Depends(get_current_admin)):
    products = await db.products.find({}, {"_id": 0}).to_list(10000)
    categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
    
    return {
        "products": products,
        "categories": categories,
        "total_value": sum(p["price"] * p["quantity"] for p in products),
        "generated_at": datetime.now(timezone.utc).isoformat()
    }

# Seed endpoint - run once after deploy. Requires X-Seed-Key header matching SEED_SECRET env var.
@api_router.post("/seed")
async def run_seed(request: Request):
    """Create admin@kuber.com if missing. Call after deploy. Requires header: X-Seed-Key: <SEED_SECRET>"""
    seed_secret = os.environ.get("SEED_SECRET")
    if not seed_secret:
        raise HTTPException(status_code=404, detail="Seed not configured")
    if request.headers.get("X-Seed-Key") != seed_secret:
        raise HTTPException(status_code=403, detail="Invalid seed key")
    ADMIN_EMAIL = "admin@kuber.com"
    ADMIN_PASSWORD = "admin123"
    existing = await db.admins.find_one({"email": ADMIN_EMAIL})
    if existing:
        return {"message": "Admin already exists", "email": ADMIN_EMAIL}
    admin_password = bcrypt.hashpw(ADMIN_PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    admin = {
        "id": str(uuid.uuid4()),
        "email": ADMIN_EMAIL,
        "password_hash": admin_password,
        "name": "Admin User",
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.admins.insert_one(admin)
    cat_count = await db.categories.count_documents({})
    if cat_count == 0:
        categories = [
            {"id": str(uuid.uuid4()), "name": "Jewellery", "description": "Gold and silver jewellery items", "product_count": 0},
            {"id": str(uuid.uuid4()), "name": "Handicrafts", "description": "Traditional handicraft items", "product_count": 0},
            {"id": str(uuid.uuid4()), "name": "Textiles", "description": "Traditional textiles and fabrics", "product_count": 0},
            {"id": str(uuid.uuid4()), "name": "Home Decor", "description": "Decorative items for home", "product_count": 0},
        ]
        await db.categories.insert_many(categories)
    return {"message": "Seed complete", "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}

# Admin Management
@api_router.get("/admins", response_model=List[AdminResponse])
async def get_admins(admin: dict = Depends(get_current_admin)):
    admins = await db.admins.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return admins

# Chatbot Endpoint
@api_router.post("/chat")
async def chat_with_inventory(request: ChatRequest, admin: dict = Depends(get_current_admin)):
    """
    Chatbot endpoint that fetches real inventory data and uses AI to format responses.
    Uses Google Gemini API for natural language responses.
    """
    try:
        # Fetch real inventory data from database
        products = await db.products.find({}, {"_id": 0}).to_list(10000)
        categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
        
        # Calculate inventory statistics
        total_products = len(products)
        total_stock_value = sum(p["price"] * p["quantity"] for p in products)
        low_stock_products = [p for p in products if p["quantity"] <= p.get("low_stock_threshold", 10)]
        out_of_stock_products = [p for p in products if p["quantity"] == 0]
        
        # Category-wise breakdown
        category_stats = {}
        for cat in categories:
            cat_products = [p for p in products if p["category"] == cat["name"]]
            category_stats[cat["name"]] = {
                "count": len(cat_products),
                "total_value": sum(p["price"] * p["quantity"] for p in cat_products)
            }
        
        # Prepare inventory context for AI
        inventory_context = f"""
REAL INVENTORY DATA (DO NOT MAKE UP ANY NUMBERS):

Total Products: {total_products}
Total Stock Value: ₹{total_stock_value:,.2f}
Low Stock Items: {len(low_stock_products)}
Out of Stock Items: {len(out_of_stock_products)}

Categories:
{chr(10).join([f"- {name}: {stats['count']} products, Value: ₹{stats['total_value']:,.2f}" for name, stats in category_stats.items()])}

Low Stock Products:
{chr(10).join([f"- {p['name']} (SKU: {p['sku']}): {p['quantity']} units (Threshold: {p.get('low_stock_threshold', 10)})" for p in low_stock_products[:10]])}

{"Out of Stock Products:" if out_of_stock_products else ""}
{chr(10).join([f"- {p['name']} (SKU: {p['sku']})" for p in out_of_stock_products[:10]]) if out_of_stock_products else ""}

All Products Summary:
{chr(10).join([f"- {p['name']}: {p['quantity']} units @ ₹{p['price']:,.2f} each ({p['category']})" for p in products[:20]])}
"""
        
        # AI provider: prefer GEMINI_API_KEY, fallback to OPENROUTER_API_KEY
        # Model: gemini-2.5-flash (Gemini) or openai/gemini-2-flash (OpenRouter)
        gemini_api_key = os.environ.get('GEMINI_API_KEY')
        openrouter_api_key = os.environ.get('OPENROUTER_API_KEY')
        api_key = gemini_api_key or openrouter_api_key
        if not api_key:
            return {
                "response": "I apologize, but the chatbot is not configured. Please add GEMINI_API_KEY or OPENROUTER_API_KEY to your environment variables.",
                "error": "API key not found"
            }
        
        # Prepare prompt for AI
        system_instruction = f"""You are a helpful inventory assistant for Kuber, a jewellery, handicrafts, and textiles company. 

CRITICAL RULES:
1. Use ONLY the exact numbers and data provided in the inventory context below
2. NEVER make up or guess any numbers
3. If asked about a product not in the data, say you don't have that information
4. Keep responses concise and professional
5. Format currency as ₹ (Indian Rupees)
6. If asked about specific products, search the provided data carefully

{inventory_context}"""

        full_prompt = f"{system_instruction}\n\nUser Question: {request.message}"
        
        # Call AI API: Gemini direct if GEMINI_API_KEY, else OpenRouter (OpenAI-compatible)
        async with httpx.AsyncClient() as http_client:
            if gemini_api_key:
                # Direct Gemini API - model: gemini-2.5-flash
                response = await http_client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_api_key}",
                    headers={"Content-Type": "application/json"},
                    json={
                        "contents": [{"parts": [{"text": full_prompt}]}],
                        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 500},
                    },
                    timeout=30.0
                )
                if response.status_code != 200:
                    logger.error(f"Gemini API error: {response.status_code} - {response.text}")
                    return {
                        "response": "I'm having trouble connecting to the AI service. Please try again.",
                        "error": f"Gemini API error: {response.status_code}"
                    }
                response_data = response.json()
                try:
                    ai_response = response_data["candidates"][0]["content"]["parts"][0]["text"]
                except (KeyError, IndexError) as e:
                    logger.error(f"Error parsing Gemini response: {e}")
                    return {"response": "I received an unexpected response format. Please try again.", "error": "Response parsing error"}
            else:
                # OpenRouter API (OpenAI-compatible) - model: google/gemini-2-flash
                # TODO: If using a different OpenRouter model, set OPENROUTER_MODEL env var
                model = os.environ.get("OPENROUTER_MODEL", "google/gemini-2-flash:free")
                response = await http_client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {openrouter_api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": os.environ.get("OPENROUTER_APP_URL", "https://kuber-inventory.local"),
                    },
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": full_prompt}],
                        "temperature": 0.3,
                        "max_tokens": 500,
                    },
                    timeout=30.0
                )
                if response.status_code != 200:
                    logger.error(f"OpenRouter API error: {response.status_code} - {response.text}")
                    return {
                        "response": "I'm having trouble connecting to the AI service. Please try again.",
                        "error": f"OpenRouter API error: {response.status_code}"
                    }
                response_data = response.json()
                try:
                    ai_response = response_data["choices"][0]["message"]["content"]
                except (KeyError, IndexError) as e:
                    logger.error(f"Error parsing OpenRouter response: {e}")
                    return {"response": "I received an unexpected response format. Please try again.", "error": "Response parsing error"}
        
        return {"response": ai_response}
        
    except Exception as e:
        logger.error(f"Chatbot error: {str(e)}")
        return {
            "response": "I encountered an error processing your request. Please try again.",
            "error": str(e)
        }

# Include router
app.include_router(api_router)

# CORS: use CORS_ORIGINS env var (comma-separated list of origins)
_origins_raw = os.environ.get('CORS_ORIGINS', '*')
_cors_origins = [o.strip() for o in _origins_raw.split(',') if o.strip()] if _origins_raw else ['*']
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()