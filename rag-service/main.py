# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from rag import chat, summarize_reviews   # <-- added summarize_reviews here

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Msg(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[Msg] = []

@app.get("/")
def root():
    return {"status": "RAG service is running"}

@app.post("/chat")
def chat_endpoint(req: ChatRequest):
    return chat(req.message, [m.dict() for m in req.history])

@app.get("/summarize/{product_id}")
def summarize_endpoint(product_id: str):
    return summarize_reviews(product_id)