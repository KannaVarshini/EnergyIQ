
import os
import json
import joblib
import numpy as np
import pandas as pd

from pathlib import Path
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# ==========================================
# 1. PROJECT PATHS
# ==========================================

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR.parent / "data" / "raw"
MODEL_DIR = BASE_DIR / "models"

MODEL_DIR.mkdir(parents=True, exist_ok=True)

FILES = {
    "Bareilly": DATA_DIR / "bareilly.csv",
    "Mathura": DATA_DIR / "mathura.csv"
}

# ==========================================
# 2. LOAD AND STANDARDIZE DATA
# ==========================================

def load_dataset(path, region):

    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")

    df = pd.read_csv(path, low_memory=False)

    # Standardize column names
    df.columns = (
        df.columns.astype(str)
        .str.strip()
        .str.lower()
        .str.replace(" ", "_", regex=False)
    )

    # Recognize common column aliases
    aliases = {
        "date": ["date", "datetime", "timestamp"],
        "meter": ["meter", "meter_id", "meter_number"],
        "t_kwh": ["t_kwh", "kwh", "consumption", "units"]
    }

    rename = {}

    for standard, possible in aliases.items():
        found = next(
            (col for col in possible if col in df.columns),
            None
        )

        if found is None:
            raise ValueError(
                f"{region}: Missing {standard} column. "
                f"Available columns: {list(df.columns)}"
            )

        rename[found] = standard

    df = df.rename(columns=rename)

    df["Date"] = pd.to_datetime(
        df["date"], errors="coerce"
    )

    df["t_kWh"] = pd.to_numeric(
        df["t_kwh"], errors="coerce"
    )

    df["meter"] = df["meter"].astype(str).str.strip()
    df["region"] = region

    df = df[
        ["Date", "meter", "region", "t_kWh"]
    ]

    df = df.dropna()

    df = df[
        (df["meter"] != "") &
        (df["t_kWh"] >= 0)
    ]

    return df


# ==========================================
# 3. COMBINE REGIONAL DATASETS
# ==========================================

print("\nLoading EnergyIQ datasets...")

datasets = []

for region, path in FILES.items():

    df = load_dataset(path, region)

    print(f"{region}: {len(df)} records")

    datasets.append(df)

data = pd.concat(
    datasets,
    ignore_index=True
)

# Handle duplicate meter/date records
data = (
    data.groupby(
        ["region", "meter", "Date"],
        as_index=False
    )["t_kWh"]
    .mean()
)

data = data.sort_values(
    ["region", "meter", "Date"]
).reset_index(drop=True)

print("\nCombined records:", len(data))
print("Unique meters:", data["meter"].nunique())
print("Regions:", data["region"].unique())

# ==========================================
# 4. FEATURE ENGINEERING
# ==========================================

group = data.groupby(["region", "meter"])["t_kWh"]

data["day"] = data["Date"].dt.day
data["month"] = data["Date"].dt.month
data["day_of_week"] = data["Date"].dt.dayofweek
data["is_weekend"] = (
    data["day_of_week"] >= 5
).astype(int)

# Historical consumption features
data["lag_1"] = group.shift(1)
data["lag_7"] = group.shift(7)

# Shift first to prevent target leakage
data["rolling_mean_7"] = group.transform(
    lambda x: x.shift(1).rolling(
        window=7,
        min_periods=7
    ).mean()
)

# Remove records without sufficient history
data = data.dropna().reset_index(drop=True)

print("\nRecords after feature engineering:", len(data))

# ==========================================
# 5. SELECT FEATURES AND TARGET
# ==========================================

FEATURES = [
    "region",
    "meter",
    "day",
    "month",
    "day_of_week",
    "is_weekend",
    "lag_1",
    "lag_7",
    "rolling_mean_7"
]

TARGET = "t_kWh"

categorical_features = ["region", "meter"]

numeric_features = [
    col for col in FEATURES
    if col not in categorical_features
]

# ==========================================
# 6. CHRONOLOGICAL TRAIN/TEST SPLIT
# ==========================================

data = data.sort_values("Date").reset_index(drop=True)

split_date = data["Date"].quantile(0.80)

train = data[data["Date"] <= split_date].copy()
test = data[data["Date"] > split_date].copy()

X_train = train[FEATURES]
y_train = train[TARGET]

X_test = test[FEATURES]
y_test = test[TARGET]

print("\nTraining records:", len(train))
print("Testing records:", len(test))
print("Split date:", split_date)

if len(train) == 0 or len(test) == 0:
    raise ValueError("Insufficient data for chronological split.")

# ==========================================
# 7. BUILD RANDOM FOREST MODEL
# ==========================================

preprocessor = ColumnTransformer(
    transformers=[
        (
            "categorical",
            OneHotEncoder(handle_unknown="ignore"),
            categorical_features
        ),
        (
            "numeric",
            "passthrough",
            numeric_features
        )
    ]
)

model = Pipeline([
    ("preprocessor", preprocessor),

    ("regressor", RandomForestRegressor(
        n_estimators=200,
        max_depth=20,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    ))
])

# ==========================================
# 8. TRAIN AND EVALUATE
# ==========================================

print("\nTraining Random Forest model...")

model.fit(X_train, y_train)

predictions = model.predict(X_test)

mae = mean_absolute_error(y_test, predictions)

rmse = np.sqrt(
    mean_squared_error(y_test, predictions)
)

r2 = r2_score(y_test, predictions)

print("\n========== MODEL EVALUATION ==========")
print(f"MAE:  {mae:.4f} kWh")
print(f"RMSE: {rmse:.4f} kWh")
print(f"R2:   {r2:.4f}")
print("======================================")

# ==========================================
# 9. TRAIN FINAL PRODUCTION MODEL
# ==========================================

print("\nTraining final model on all available records...")

model.fit(
    data[FEATURES],
    data[TARGET]
)

# ==========================================
# 10. SAVE MODEL AND METADATA
# ==========================================

model_path = MODEL_DIR / "energyiq_model.joblib"

joblib.dump(model, model_path)

metadata = {
    "project": "EnergyIQ",
    "algorithm": "RandomForestRegressor",
    "features": FEATURES,
    "target": TARGET,
    "regions": ["Bareilly", "Mathura"],
    "total_records": int(len(data)),
    "unique_meters": int(data["meter"].nunique()),
    "split_date": str(split_date.date()),
    "evaluation": {
        "MAE_kWh": float(mae),
        "RMSE_kWh": float(rmse),
        "R2": float(r2)
    }
}

with open(
    MODEL_DIR / "model_metadata.json",
    "w"
) as f:
    json.dump(metadata, f, indent=4)

print("\n======================================")
print("ENERGYIQ MODEL TRAINED SUCCESSFULLY!")
print("Model saved:", model_path)
print("Metadata saved.")
print("======================================")
