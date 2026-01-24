import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import bcrypt
import uuid
from datetime import datetime, timezone

# MongoDB connection
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

async def seed_database():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Clear existing data
    await db.admins.delete_many({})
    await db.categories.delete_many({})
    await db.products.delete_many({})
    await db.activity_logs.delete_many({})
    
    # Create demo admin
    admin_password = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    admin = {
        "id": str(uuid.uuid4()),
        "email": "admin@kuber.com",
        "password_hash": admin_password,
        "name": "Admin User",
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admins.insert_one(admin)
    print("✓ Created demo admin: admin@kuber.com / admin123")
    
    # Create categories
    categories = [
        {"id": str(uuid.uuid4()), "name": "Jewellery", "description": "Gold and silver jewellery items", "product_count": 0},
        {"id": str(uuid.uuid4()), "name": "Handicrafts", "description": "Traditional handicraft items", "product_count": 0},
        {"id": str(uuid.uuid4()), "name": "Textiles", "description": "Traditional textiles and fabrics", "product_count": 0},
        {"id": str(uuid.uuid4()), "name": "Home Decor", "description": "Decorative items for home", "product_count": 0},
    ]
    await db.categories.insert_many(categories)
    print(f"✓ Created {len(categories)} categories")
    
    # Create sample products
    products = [
        {
            "id": str(uuid.uuid4()),
            "name": "Gold Necklace",
            "sku": "KBR-JW-001",
            "description": "Traditional 22K gold necklace with intricate designs",
            "price": 125000,
            "quantity": 15,
            "category": "Jewellery",
            "images": ["https://images.unsplash.com/photo-1705684451639-c03ebdf8bd9c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwxfHxnb2xkJTIwbmVja2xhY2UlMjBqZXdlbGxlcnklMjB3aGl0ZSUyMGJhY2tncm91bmQlMjBoaWdoJTIwcXVhbGl0eXxlbnwwfHx8fDE3NjkyNzM4ODV8MA&ixlib=rb-4.1.0&q=85"],
            "low_stock_threshold": 10,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Diamond Pendant",
            "sku": "KBR-JW-002",
            "description": "Elegant diamond pendant with silver chain",
            "price": 85000,
            "quantity": 8,
            "category": "Jewellery",
            "images": ["https://images.pexels.com/photos/15064041/pexels-photo-15064041.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"],
            "low_stock_threshold": 10,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Traditional Silk Saree",
            "sku": "KBR-TX-001",
            "description": "Handwoven silk saree with traditional patterns",
            "price": 15000,
            "quantity": 25,
            "category": "Textiles",
            "images": ["https://images.unsplash.com/photo-1672642919593-976728ec5b5f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODd8MHwxfHNlYXJjaHwzfHxpbmRpYW4lMjBoYW5kaWNyYWZ0cyUyMHRleHRpbGVzJTIwY29sb3JmdWwlMjBkZXRhaWx8ZW58MHx8fHwxNzY5MjczODg3fDA&ixlib=rb-4.1.0&q=85"],
            "low_stock_threshold": 15,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Embroidered Cushion Covers",
            "sku": "KBR-TX-002",
            "description": "Set of 4 embroidered cushion covers",
            "price": 2500,
            "quantity": 50,
            "category": "Textiles",
            "images": ["https://images.pexels.com/photos/34547922/pexels-photo-34547922.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"],
            "low_stock_threshold": 20,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Handmade Paper Art",
            "sku": "KBR-HC-001",
            "description": "Beautiful handcrafted paper art wall hanging",
            "price": 3500,
            "quantity": 30,
            "category": "Handicrafts",
            "images": ["https://images.unsplash.com/photo-1703145219083-6037d97decb5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODd8MHwxfHNlYXJjaHw0fHxpbmRpYW4lMjBoYW5kaWNyYWZ0cyUyMHRleHRpbGVzJTIwY29sb3JmdWwlMjBkZXRhaWx8ZW58MHx8fHwxNzY5MjczODg3fDA&ixlib=rb-4.1.0&q=85"],
            "low_stock_threshold": 15,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Brass Ganesha Statue",
            "sku": "KBR-HD-001",
            "description": "Traditional brass Ganesha statue - 8 inches",
            "price": 4500,
            "quantity": 12,
            "category": "Home Decor",
            "images": [],
            "low_stock_threshold": 15,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Silver Bangles Set",
            "sku": "KBR-JW-003",
            "description": "Set of 6 traditional silver bangles",
            "price": 18000,
            "quantity": 5,
            "category": "Jewellery",
            "images": [],
            "low_stock_threshold": 10,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Wooden Handicraft Box",
            "sku": "KBR-HC-002",
            "description": "Handcarved wooden jewellery box with mirror",
            "price": 2800,
            "quantity": 20,
            "category": "Handicrafts",
            "images": [],
            "low_stock_threshold": 10,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.products.insert_many(products)
    print(f"✓ Created {len(products)} sample products")
    
    # Create activity logs
    activity_logs = []
    for product in products[:5]:
        activity_logs.append({
            "id": str(uuid.uuid4()),
            "product_id": product["id"],
            "product_name": product["name"],
            "action": "created",
            "quantity_change": product["quantity"],
            "admin_email": "admin@kuber.com",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    await db.activity_logs.insert_many(activity_logs)
    print(f"✓ Created {len(activity_logs)} activity logs")
    
    print("\n✅ Database seeded successfully!")
    print("\nYou can now login with:")
    print("Email: admin@kuber.com")
    print("Password: admin123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
