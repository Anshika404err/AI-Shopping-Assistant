# ingest.py
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
products = list(client["shop"]["products"].find())
print(f"Loaded {len(products)} products from MongoDB")

docs = []
for p in products:
    specs = ", ".join(f"{k}: {v}" for k, v in p.get("specs", {}).items())
    reviews_text = " | ".join(
        (r.get("text") or r.get("title") or "") for r in p.get("reviews", [])[:5]
    )
    text = (
        f"{p['name']}. Brand: {p.get('brand')}. Category: {p.get('category')}. "
        f"Price: Rs {p.get('price')}. Rating: {p.get('rating')}. "
        f"{p.get('description', '')} Specs: {specs}. Reviews: {reviews_text}"
    )
    docs.append(Document(
        page_content=text,
        metadata={
            "id": str(p["_id"]),
            "name": p["name"],
            "price": p.get("price"),
            "category": p.get("category"),
        },
    ))

print("Building embeddings... (downloads the model on first run, ~90MB)")
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

print("Creating FAISS index...")
db = FAISS.from_documents(docs, embeddings)
db.save_local("faiss_index")

print(f"Done. Indexed {len(docs)} products into faiss_index/")