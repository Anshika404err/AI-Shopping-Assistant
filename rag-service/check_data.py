import pandas as pd

for f in ["data/amazon.csv"]:
    df = pd.read_csv(f)
    print("FILE:", f)
    print("COLUMNS:", df.columns.tolist())
    print("SHAPE:", df.shape)
    print(df.iloc[0])
    print("-" * 50)