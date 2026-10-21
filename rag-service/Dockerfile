FROM python:3.11-slim

WORKDIR /app
ENV HF_HOME=/app/hf_cache

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the embedding model so startup is fast
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

COPY . .
RUN useradd -m -u 1000 user && chown -R user /app
USER user

EXPOSE 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]