from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
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

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)

# Create the main app
app = FastAPI()
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
    Uses OpenRouter API for natural language responses.
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
        
        # Get OpenRouter API key from environment
        openrouter_api_key = os.environ.get('OPENROUTER_API_KEY')
        if not openrouter_api_key:
            return {
                "response": "I apologize, but the chatbot is not configured. Please add OPENROUTER_API_KEY to your environment variables.",
                "error": "API key not found"
            }
        
        # Call OpenRouter API with real data
        async with httpx.AsyncClient() as client:
            openrouter_response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openrouter_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "meta-llama/llama-3.2-3b-instruct:free",
                    "messages": [
                        {
                            "role": "system",
                            "content": f"""You are a helpful inventory assistant for Kuber, a jewellery, handicrafts, and textiles company. 

CRITICAL RULES:
1. Use ONLY the exact numbers and data provided in the inventory context below
2. NEVER make up or guess any numbers
3. If asked about a product not in the data, say you don't have that information
4. Keep responses concise and professional
5. Format currency as ₹ (Indian Rupees)
6. If asked about specific products, search the provided data carefully

{inventory_context}"""
                        },
                        {
                            "role": "user",
                            "content": request.message
                        }
                    ],
                    "max_tokens": 500,
                    "temperature": 0.3
                },
                timeout=30.0
            )
        
        if openrouter_response.status_code != 200:
            return {
                "response": "I'm having trouble connecting to the AI service. Please try again.",
                "error": f"OpenRouter API error: {openrouter_response.status_code}"
            }
        
        response_data = openrouter_response.json()
        ai_response = response_data["choices"][0]["message"]["content"]
        
        return {"response": ai_response}
        
    except Exception as e:
        logger.error(f"Chatbot error: {str(e)}")
        return {
            "response": "I encountered an error processing your request. Please try again.",
            "error": str(e)
        }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()