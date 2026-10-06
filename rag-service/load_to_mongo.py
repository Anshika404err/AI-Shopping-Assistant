# load_to_mongo.py
import json
import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

uri = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
client = MongoClient(uri, serverSelectionTimeoutMS=5000)

try:
    client.admin.command("ping")
    print("Connected to MongoDB")
except Exception as e:
    raise SystemExit(f"Cannot connect to MongoDB. Is it running?\n{e}")

col = client["shop"]["products"]

with open("products.json", encoding="utf-8") as f:
    products = json.load(f)

col.delete_many({})
col.insert_many(products)

col.create_index("category")
col.create_index("price")

print("Inserted", col.count_documents({}), "products")