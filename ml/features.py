import pandas as pd
from sklearn.preprocessing import LabelEncoder


def build_features(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """
    Engineer features from a cleaned DataFrame and return (X, y).

    Expected columns: date, quantity, and optionally product_code.
    Returns X (feature DataFrame) and y (target Series).
    """
    df = df.copy()

    # Temporal features
    df["month"] = df["date"].dt.month
    df["day_of_week"] = df["date"].dt.dayofweek

    has_product = "product_code" in df.columns

    if has_product:
        df["product_code"] = df["product_code"].astype(str).fillna("UNKNOWN")
        enc = LabelEncoder()
        df["product_encoded"] = enc.fit_transform(df["product_code"])

        # Per-product rolling stats (window=7, min 1 observation)
        df = df.sort_values(["product_code", "date"])
        df["moving_avg"] = (
            df.groupby("product_code")["quantity"]
            .transform(lambda s: s.shift(1).rolling(7, min_periods=1).mean())
            .fillna(df["quantity"].mean())
        )
        df["consumption"] = (
            df.groupby("product_code")["quantity"]
            .transform(lambda s: s.diff().abs())
            .fillna(0)
        )
    else:
        df = df.sort_values("date")
        df["moving_avg"] = (
            df["quantity"].shift(1).rolling(7, min_periods=1).mean().fillna(df["quantity"].mean())
        )
        df["consumption"] = df["quantity"].diff().abs().fillna(0)

    feature_cols = ["month", "day_of_week", "moving_avg", "consumption"]
    if has_product:
        feature_cols.append("product_encoded")

    X = df[feature_cols].copy()
    y = df["quantity"].copy()

    print(f"[FEATURES] Feature columns: {feature_cols}")
    print(f"[FEATURES] X shape: {X.shape}, y shape: {y.shape}")

    return X, y
