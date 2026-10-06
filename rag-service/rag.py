# rag.py
import os
from dotenv import load_dotenv

try:
    from langchain_huggingface import HuggingFaceEmbeddings  # pyright: ignore[reportMissingImports]
except ImportError:
    from langchain_community.embeddings import HuggingFaceEmbeddings  # pyright: ignore[reportMissingImports]

try:
    from langchain_community.vectorstores import FAISS  # pyright: ignore[reportMissingImports]
except ImportError:
    from langchain.vectorstores import FAISS  # pyright: ignore[reportMissingImports]

from langchain_google_genai import ChatGoogleGenerativeAI

try:
    from langchain_core.prompts import ChatPromptTemplate  # pyright: ignore[reportMissingImports]
    from langchain_core.output_parsers import StrOutputParser  # pyright: ignore[reportMissingImports]
except ImportError:  # compatibility with older langchain package layouts
    try:
        from langchain.prompts import ChatPromptTemplate  # pyright: ignore[reportMissingImports]
        from langchain.output_parsers import StrOutputParser  # pyright: ignore[reportMissingImports]
    except ImportError:
        raise

load_dotenv()

embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
db = FAISS.load_local("faiss_index", embeddings, allow_dangerous_deserialization=True)
retriever = db.as_retriever(search_kwargs={"k": 5})
llm = ChatGoogleGenerativeAI(
    model="gemini-3.5-flash-lite",
    temperature=0.3,
    max_retries=5,
    timeout=60,
)

condense_prompt = ChatPromptTemplate.from_template(
    "Given the chat history and the latest question, rewrite the question so it "
    "is fully standalone. Return only the rewritten question.\n\n"
    "History:\n{history}\n\nQuestion: {question}"
)
condense_chain = condense_prompt | llm | StrOutputParser()

answer_prompt = ChatPromptTemplate.from_template(
    """You are a helpful shopping assistant. Answer ONLY using the products in the context.
If the context does not contain a suitable product, say so honestly. Never invent
products, prices or specs.

If the customer is comparing products or asks "vs"/"compare"/"which is better",
respond with a markdown comparison table (Product | Price | Rating | Key Features)
followed by a clear one-line recommendation.

If the customer is not comparing, answer directly and recommend the single best fit,
explaining briefly why.

When asked about reviews or opinions, summarise pros and cons in bullet points.

Context:
{context}

Conversation so far:
{history}

Customer question: {question}

Answer:"""
)
answer_chain = answer_prompt | llm | StrOutputParser()

def format_history(history):
    return "\n".join(f"{m['role']}: {m['content']}" for m in history) or "None"

def chat(question: str, history: list):
    h = format_history(history)
    standalone = condense_chain.invoke({"history": h, "question": question}) if history else question
    docs = retriever.invoke(standalone)
    context = "\n\n".join(f"[{i+1}] {d.page_content}" for i, d in enumerate(docs))
    answer = answer_chain.invoke({"context": context, "history": h, "question": question})
    products = [{"id": d.metadata["id"], "name": d.metadata["name"],
                 "price": d.metadata["price"]} for d in docs]
    return {"answer": answer, "products": products}
#if __name__ == "__main__":
  #  result = chat("suggest a good budget bluetooth headphone under 1500 rupees", [])
    #print("ANSWER:\n", result["answer"])
  #  print("\nMATCHED PRODUCTS:")
  #  for p in result["products"]:
  #      print(" -", p["name"], "| Rs", p["price"])
  
def summarize_reviews(product_id: str):
    from bson import ObjectId
    from pymongo import MongoClient
    import os as _os

    client = MongoClient(_os.getenv("MONGO_URI"))
    product = client["shop"]["products"].find_one({"_id": ObjectId(product_id)})

    if not product:
        return {"error": "Product not found"}

    review_texts = [r.get("text") or r.get("title") or "" for r in product.get("reviews", [])]
    review_texts = [t for t in review_texts if t.strip()]

    if not review_texts:
        return {"product_name": product["name"], "summary": "No reviews available for this product yet."}

    combined = "\n".join(f"- {t}" for t in review_texts[:10])

    summary_prompt = ChatPromptTemplate.from_template(
        """Summarize these customer reviews for "{product_name}" into:
1. Three short pros (bullet points)
2. Three short cons (bullet points)
3. One-line overall verdict

Reviews:
{reviews}

Keep it concise and honest. If reviews are mostly positive with few complaints, say so."""
    )
    summary_chain = summary_prompt | llm | StrOutputParser()
    summary = summary_chain.invoke({"product_name": product["name"], "reviews": combined})

    return {"product_name": product["name"], "summary": summary}