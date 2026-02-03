"""
Seed script: creates demo admin if missing. Does NOT overwrite existing data.
Run once after deploy: python seed.py
"""
import asyncio
import os
import sys
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
import uuid
from datetime import datetime, timezone

# Load .env
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / '.env')
except ImportError:
    pass

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'kuber_inventory')

ADMIN_EMAIL = 'admin@kuber.com'
ADMIN_PASSWORD = 'admin123'


async def seed_database():
    if not MONGO_URL or not DB_NAME:
        print("ERROR: Set MONGO_URL and DB_NAME in .env", file=sys.stderr)
        sys.exit(1)

    # tlsAllowInvalidCertificates works around SSL handshake errors on macOS/Anaconda
    client = AsyncIOMotorClient(
        MONGO_URL,
        tlsAllowInvalidCertificates=True,
        serverSelectionTimeoutMS=30000,
    )
    db = client[DB_NAME]

    # Create admin only if it doesn't exist (do not overwrite existing data)
    existing = await db.admins.find_one({"email": ADMIN_EMAIL})
    if existing:
        print(f"Admin {ADMIN_EMAIL} already exists. Skipping seed.")
        client.close()
        return

    admin_password = bcrypt.hashpw(ADMIN_PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    admin = {
        "id": str(uuid.uuid4()),
        "email": ADMIN_EMAIL,
        "password_hash": admin_password,
        "name": "Admin User",
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admins.insert_one(admin)
    print(f"Created demo admin: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")

    # Create default categories only if none exist
    cat_count = await db.categories.count_documents({})
    if cat_count == 0:
        categories = [
            {"id": str(uuid.uuid4()), "name": "Jewellery", "description": "Gold and silver jewellery items", "product_count": 0},
            {"id": str(uuid.uuid4()), "name": "Handicrafts", "description": "Traditional handicraft items", "product_count": 0},
            {"id": str(uuid.uuid4()), "name": "Textiles", "description": "Traditional textiles and fabrics", "product_count": 0},
            {"id": str(uuid.uuid4()), "name": "Home Decor", "description": "Decorative items for home", "product_count": 0},
        ]
        await db.categories.insert_many(categories)
        print(f"Created {len(categories)} default categories")
    else:
        print(f"Categories already exist ({cat_count}). Skipping.")

    client.close()
    print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed_database())
