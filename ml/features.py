import numpy as np
import pandas as pd


# Lag windows (in months) used for both training and prediction
LAG_WINDOWS     = [1, 2, 3, 6, 12]
ROLLING_WINDOWS = [3, 6, 12]


def _add_time_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add month_index (global linear trend counter) derived from year_month."""
    base = df["year_month"].min()
    df["month_index"] = (
        (df["year_month"].dt.year - base.year) * 12
        + (df["year_month"].dt.month - base.month)
    )
    return df


def _add_lag_rolling(df: pd.DataFrame, group_col: str | None) -> pd.DataFrame:
    """Add lag and rolling-mean features, optionally grouped by product."""
    def _compute(s: pd.Series) -> pd.DataFrame:
        result = {}
        for lag in LAG_WINDOWS:
            result[f"lag_{lag}"] = s.shift(lag)
        for win in ROLLING_WINDOWS:
            result[f"rolling_{win}"] = s.shift(1).rolling(win, min_periods=1).mean()
        return pd.DataFrame(result, index=s.index)

    if group_col:
        parts = []
        for _, grp in df.groupby(group_col, sort=False):
            parts.append(_compute(grp["quantity"]))
        lag_df = pd.concat(parts).sort_index()
    else:
        lag_df = _compute(df["quantity"])

    return pd.concat([df, lag_df], axis=1)


def build_features(monthly_df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """
    Build the training feature matrix from monthly aggregated data.

    Returns (X, y) where y = quantity and X contains all lag/rolling/temporal features.
    Rows that have NaN lag values (first N rows per product) are dropped — this is
    expected behaviour for time-series lag features.
    """
    df = monthly_df.copy()
    has_product = "product_encoded" in df.columns

    df = _add_time_features(df)
    df = _add_lag_rolling(df, "product_code" if has_product else None)

    # Drop rows where lag_12 is still NaN (not enough history)
    df = df.dropna(subset=[f"lag_{max(LAG_WINDOWS)}"])

    feature_cols = (
        ["month", "quarter", "year", "month_index"]
        + [f"lag_{l}" for l in LAG_WINDOWS]
        + [f"rolling_{w}" for w in ROLLING_WINDOWS]
    )
    if has_product:
        feature_cols.append("product_encoded")

    X = df[feature_cols].copy()
    y = df["quantity"].copy()

    print(f"[FEATURES] Feature cols: {feature_cols}")
    print(f"[FEATURES] X shape: {X.shape}, y shape: {y.shape}")
    return X, y


def build_prediction_row(
    seed: pd.DataFrame,
    target_period: pd.Period,
    base_period: pd.Period,
    product_encoded: int | None,
) -> pd.DataFrame:
    """
    Build a single feature row for `target_period` using `seed` as the
    historical window.  `seed` must be sorted chronologically and contain
    at least the previous months needed for the longest lag.
    """
    qty = seed["quantity"].values  # chronological order, most recent last

    def _lag(n: int) -> float:
        idx = len(qty) - n
        return float(qty[idx]) if idx >= 0 else float(np.mean(qty))

    def _rolling_mean(n: int) -> float:
        window = qty[-n:] if len(qty) >= n else qty
        return float(np.mean(window)) if len(window) > 0 else 0.0

    month_index = (target_period.year - base_period.year) * 12 + (
        target_period.month - base_period.month
    )

    row: dict[str, float] = {
        "month":       float(target_period.month),
        "quarter":     float((target_period.month - 1) // 3 + 1),
        "year":        float(target_period.year),
        "month_index": float(month_index),
    }
    for l in LAG_WINDOWS:
        row[f"lag_{l}"] = _lag(l)
    for w in ROLLING_WINDOWS:
        row[f"rolling_{w}"] = _rolling_mean(w)
    if product_encoded is not None:
        row["product_encoded"] = float(product_encoded)

    return pd.DataFrame([row])
