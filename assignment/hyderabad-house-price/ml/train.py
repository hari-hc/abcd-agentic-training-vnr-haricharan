"""
Hyderabad House Price Prediction - ML Training Pipeline
Trains multiple models, selects best, saves model + preprocessing pipeline.
"""

import os
import sys
import re
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import r2_score, mean_squared_error

# ─────────────────────────────────────────────
# 1. LOAD & CLEAN DATA
# ─────────────────────────────────────────────
DATA_PATH = os.path.join(os.path.dirname(__file__), "Hyderbad_House_price.csv")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def extract_bhk(title: str) -> int:
    """Extract BHK number from title string."""
    match = re.search(r"(\d+)\s*BHK", str(title), re.IGNORECASE)
    return int(match.group(1)) if match else 1


def normalize_text(s: str) -> str:
    """Lowercase, strip, replace spaces with underscores."""
    return str(s).lower().strip().replace(" ", "_")


def load_and_clean(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)

    # Drop irrelevant columns
    df.drop(columns=["Unnamed: 0"], errors="ignore", inplace=True)

    # Extract BHK from title
    df["bhk"] = df["title"].apply(extract_bhk)
    df.drop(columns=["title"], inplace=True)

    # Normalize categorical columns
    df["location"] = df["location"].apply(normalize_text)
    df["building_status"] = df["building_status"].apply(normalize_text)

    # Map building_status to canonical values
    status_map = {
        "under_construction": "under_construction",
        "new": "under_construction",          # treat 'new' as under_construction
        "ready_to_move": "ready_to_move",
        "resale": "ready_to_move",             # treat 'resale' as ready_to_move
    }
    df["building_status"] = df["building_status"].map(status_map)

    # Ensure numeric types
    df["price(L)"] = pd.to_numeric(df["price(L)"], errors="coerce")
    df["area_insqft"] = pd.to_numeric(df["area_insqft"], errors="coerce")
    df["rate_persqft"] = pd.to_numeric(df["rate_persqft"], errors="coerce")
    df["bhk"] = df["bhk"].astype(int)

    # Drop rows with missing values
    df.dropna(inplace=True)

    # Remove outliers: price above 99th percentile
    p99 = df["price(L)"].quantile(0.99)
    df = df[df["price(L)"] <= p99]

    # Group rare locations (fewer than 10 occurrences) into 'other'
    location_counts = df["location"].value_counts()
    rare_locations = location_counts[location_counts < 10].index
    df["location"] = df["location"].apply(
        lambda x: "other" if x in rare_locations else x
    )

    # Feature engineering: area per BHK
    df["area_per_bhk"] = df["area_insqft"] / df["bhk"]

    print(f"[DATA] Shape after cleaning: {df.shape}")
    print(f"[DATA] Unique locations: {df['location'].nunique()}")
    print(f"[DATA] Building statuses: {df['building_status'].unique()}")
    return df


# ─────────────────────────────────────────────
# 2. FEATURES & TARGET
# ─────────────────────────────────────────────
FEATURES = ["location", "building_status", "bhk", "area_insqft", "rate_persqft", "area_per_bhk"]
TARGET = "price(L)"

CATEGORICAL_FEATURES = ["location", "building_status"]
NUMERICAL_FEATURES = ["bhk", "area_insqft", "rate_persqft", "area_per_bhk"]


def build_preprocessor(location_categories: list) -> ColumnTransformer:
    categorical_transformer = OneHotEncoder(
        handle_unknown="ignore",
        sparse_output=False,
        categories=[location_categories, ["ready_to_move", "under_construction"]],
    )
    numerical_transformer = StandardScaler()

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", categorical_transformer, CATEGORICAL_FEATURES),
            ("num", numerical_transformer, NUMERICAL_FEATURES),
        ]
    )
    return preprocessor


# ─────────────────────────────────────────────
# 3. TRAIN & EVALUATE
# ─────────────────────────────────────────────
def evaluate_model(name, pipeline, X_test, y_test):
    preds = pipeline.predict(X_test)
    r2 = r2_score(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    print(f"  [{name}] R²={r2:.4f}  RMSE={rmse:.2f} Lakhs")
    return r2, rmse


def train():
    df = load_and_clean(DATA_PATH)

    X = df[FEATURES]
    y = df[TARGET]

    # Get sorted unique locations (including 'other') for fixed encoder categories
    location_categories = sorted(X["location"].unique().tolist())

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"[SPLIT] Train: {X_train.shape[0]}  Test: {X_test.shape[0]}")

    preprocessor = build_preprocessor(location_categories)

    models = {
        "LinearRegression": LinearRegression(),
        "RandomForest": RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1),
        "GradientBoosting": GradientBoostingRegressor(
            n_estimators=300, learning_rate=0.05, max_depth=5, random_state=42
        ),
    }

    results = {}
    pipelines = {}

    print("\n[TRAINING] Evaluating models...")
    for name, model in models.items():
        pipe = Pipeline([
            ("preprocessor", preprocessor),
            ("model", model),
        ])
        pipe.fit(X_train, y_train)
        r2, rmse = evaluate_model(name, pipe, X_test, y_test)
        results[name] = {"r2": r2, "rmse": rmse}
        pipelines[name] = pipe

    # Select best model by R²
    best_name = max(results, key=lambda k: results[k]["r2"])
    best_pipeline = pipelines[best_name]
    print(f"\n[BEST MODEL] {best_name} (R²={results[best_name]['r2']:.4f})")

    # Save artifacts
    model_path = os.path.join(OUTPUT_DIR, "model.pkl")
    locations_path = os.path.join(OUTPUT_DIR, "locations.pkl")

    joblib.dump(best_pipeline, model_path)
    joblib.dump(location_categories, locations_path)

    print(f"[SAVED] Model → {model_path}")
    print(f"[SAVED] Locations → {locations_path}")
    print("\n[DONE] Training complete.")


if __name__ == "__main__":
    train()
