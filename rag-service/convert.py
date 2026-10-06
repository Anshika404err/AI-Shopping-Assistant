# convert.py
import re
import json
import pandas as pd

df = pd.read_csv("data/amazon.csv")
print("Rows loaded:", len(df))

# 1. Check the columns exist before doing anything
needed = ["product_id", "product_name", "category", "discounted_price",
          "actual_price", "rating", "rating_count", "about_product"]
missing = [c for c in needed if c not in df.columns]
if missing:
    print("MISSING COLUMNS:", missing)
    print("YOUR COLUMNS ARE:", df.columns.tolist())
    raise SystemExit("Paste the two lines above to Claude and I'll adjust the script.")


# 2. Cleaning helpers
def clean_price(x):
    return pd.to_numeric(str(x).replace("₹", "").replace(",", "").strip(), errors="coerce")


def pretty_category(c):
    last = str(c).split("|")[-1].replace("&", " & ")
    last = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", last)         # "SmartTelevisions" -> "Smart Televisions"
    last = re.sub(r"(?<=[A-Z])(?=[A-Z][a-z])", " ", last)    # "USBCables" -> "USB Cables"
    return last


def build_reviews(r):
    titles = [t.strip() for t in str(r.get("review_title", "")).split(",") if t.strip()]
    users = [u.strip() for u in str(r.get("user_name", "")).split(",") if u.strip()]
    content = str(r.get("review_content", "")).strip()
    if content == "nan" or not content:
        return []
    reviews = []
    for i, t in enumerate(titles[:5]):
        reviews.append({
            "user": users[i] if i < len(users) else "Amazon customer",
            "title": t,
            "text": t,   # so ingest.py can always read r["text"]
        })
    # Full text kept as one entry, because splitting it by comma is unreliable
    reviews.append({"user": "All reviews (combined)", "text": content[:1500]})
    return reviews


# 3. Clean the columns
df["price"] = df["discounted_price"].apply(clean_price)
df["actual_price"] = df["actual_price"].apply(clean_price)
df["rating"] = pd.to_numeric(df["rating"], errors="coerce")
df["rating_count"] = pd.to_numeric(
    df["rating_count"].astype(str).str.replace(",", ""), errors="coerce")

# 4. Drop bad rows and duplicates
df = df.dropna(subset=["product_name", "price", "rating", "about_product"])
df = df.drop_duplicates(subset=["product_id"]).drop_duplicates(subset=["product_name"])

# 5. Categories
df["category_path"] = df["category"]
df["category"] = df["category_path"].apply(pretty_category)

# 6. Build one document per product
products = []
for _, r in df.iterrows():
    name = str(r["product_name"]).strip()
    products.append({
        "name": name,
        "brand": name.split()[0],
        "category": r["category"],
        "category_path": r["category_path"],
        "price": float(r["price"]),
        "rating": float(r["rating"]),
        "description": str(r["about_product"]).strip(),
        "specs": {
            "original_price": f"Rs {int(r['actual_price'])}" if pd.notna(r["actual_price"]) else "n/a",
            "discount": str(r.get("discount_percentage", "n/a")),
            "rating_count": int(r["rating_count"]) if pd.notna(r["rating_count"]) else 0,
        },
        "reviews": build_reviews(r),
        "image": str(r.get("img_link", "")),
        "link": str(r.get("product_link", "")),
    })

# 7. Save
with open("products.json", "w", encoding="utf-8") as f:
    json.dump(products, f, indent=2, ensure_ascii=False)

print("Saved", len(products), "products")
print(df["category"].value_counts().head(10))