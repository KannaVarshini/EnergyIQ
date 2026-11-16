
from database import init_db, get_db
from auth import router as auth_router, get_current_user
from pathlib import Path
from datetime import timedelta
import joblib
import pandas as pd

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware


# ---------------- PATHS ----------------

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR.parent / "data" / "raw"
MODEL_PATH = BASE_DIR / "models" / "energyiq_model.joblib"

FILES = {
    "Bareilly": DATA_DIR / "bareilly.csv",
    "Mathura": DATA_DIR / "mathura.csv",
}

TARIFF_PER_UNIT = 6.50


# ---------------- APP ----------------

app = FastAPI(
    title="EnergyIQ API",
    description="Smart Energy Consumption Monitoring and Prediction",
    version="1.1"
)

app.include_router(auth_router)


@app.on_event("startup")
def startup():
    init_db()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------- LOAD MODEL ----------------

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Trained model not found: {MODEL_PATH}"
    )

model = joblib.load(MODEL_PATH)


# ---------------- DATA HELPERS ----------------

def load_region_data(region):
    if region not in FILES:
        raise HTTPException(
            status_code=404,
            detail="Region not found"
        )

    path = FILES[region]

    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Dataset missing: {path}"
        )

    df = pd.read_csv(path, low_memory=False)

    df.columns = (
        df.columns.astype(str)
        .str.strip()
        .str.lower()
        .str.replace(" ", "_")
    )

    aliases = {
        "date": ["date", "datetime", "timestamp"],
        "meter": ["meter", "meter_id", "meter_number"],
        "t_kwh": ["t_kwh", "kwh", "consumption", "units"],
    }

    rename = {}

    for standard, possible in aliases.items():
        for col in possible:
            if col in df.columns:
                rename[col] = standard
                break

    df = df.rename(columns=rename)

    required = ["date", "meter", "t_kwh"]

    if not all(col in df.columns for col in required):
        raise HTTPException(
            status_code=500,
            detail=f"Required columns missing in {region} dataset"
        )

    df["date"] = pd.to_datetime(
        df["date"], errors="coerce"
    )

    df["t_kwh"] = pd.to_numeric(
        df["t_kwh"], errors="coerce"
    )

    df["meter"] = df["meter"].astype(str).str.strip()

    df = df.dropna(subset=required)
    df = df[df["t_kwh"] >= 0]

    df = (
        df.groupby(["date", "meter"], as_index=False)["t_kwh"]
        .mean()
        .sort_values(["meter", "date"])
    )

    return df


def get_meter_history(region, meter):
    df = load_region_data(region)

    data = df[
        df["meter"] == str(meter)
    ].sort_values("date")

    if data.empty:
        raise HTTPException(
            status_code=404,
            detail="Meter not found"
        )

    return data.reset_index(drop=True)


# ---------------- FORECAST ----------------

def predict_next_days(region, meter, history, days=7):

    if len(history) < 7:
        raise HTTPException(
            status_code=400,
            detail="At least 7 historical records are required"
        )

    values = history["t_kwh"].astype(float).tolist()
    last_date = history["date"].max()

    predictions = []

    for i in range(1, days + 1):

        future_date = last_date + timedelta(days=i)

        features = pd.DataFrame([{
            "region": region,
            "meter": str(meter),
            "day": future_date.day,
            "month": future_date.month,
            "day_of_week": future_date.day_of_week,
            "is_weekend": int(future_date.day_of_week >= 5),
            "lag_1": values[-1],
            "lag_7": values[-7],
            "rolling_mean_7": sum(values[-7:]) / 7,
        }])

        prediction = float(model.predict(features)[0])
        prediction = max(0, prediction)

        values.append(prediction)

        predictions.append({
            "date": future_date.strftime("%Y-%m-%d"),
            "predicted_kwh": round(prediction, 2)
        })

    return predictions


# ---------------- API ROUTES ----------------

@app.get("/")
def home():
    return {
        "status": "success",
        "message": "EnergyIQ API is running",
        "model_loaded": True,
        "regions": list(FILES.keys())
    }


@app.get("/api/regions")
def get_regions():
    return {
        "regions": list(FILES.keys())
    }


@app.get("/api/meters/{region}")
def get_meters(region: str):

    region = region.strip().title()
    df = load_region_data(region)

    meters = sorted(df["meter"].unique().tolist())

    return {
        "region": region,
        "total_meters": len(meters),
        "meters": meters
    }


# ---------------- OWNER PROPERTY ACCESS ----------------

@app.get("/api/owner/dashboard-properties")
def get_owner_dashboard_properties(
    user=Depends(get_current_user)
):

    if user["role"] != "owner":
        raise HTTPException(
            status_code=403,
            detail="Owner access required."
        )

    connection = get_db()

    try:
        properties = connection.execute(
            """
            SELECT
                id,
                property_name,
                region,
                meter_id,
                address,
                created_at
            FROM properties
            WHERE owner_id = ?
            ORDER BY id DESC
            """,
            (user["id"],)
        ).fetchall()

        # Include older meter assignments for backward compatibility.
        legacy = connection.execute(
            """
            SELECT DISTINCT region, meter_id
            FROM meter_assignments
            WHERE owner_id = ?
            AND active = 1
            AND property_id IS NULL
            """,
            (user["id"],)
        ).fetchall()

        result = [dict(item) for item in properties]

        for item in legacy:
            result.append({
                "id": None,
                "property_name": "Previously assigned meter",
                "region": item["region"],
                "meter_id": item["meter_id"],
                "address": "",
                "legacy": True
            })

        return {
            "total_properties": len(result),
            "properties": result
        }

    finally:
        connection.close()


# ---------------- DASHBOARD ----------------

@app.get("/api/dashboard/{region}/{meter}")
def get_dashboard(
    region: str,
    meter: str,
    user=Depends(get_current_user)
):

    region = region.strip().title()
    meter = meter.strip()

    connection = get_db()
    property_info = None

    try:

        if user["role"] == "tenant":

            assignment = connection.execute(
                """
                SELECT
                    ma.id,
                    ma.property_id,
                    p.property_name,
                    p.address
                FROM meter_assignments ma
                LEFT JOIN properties p
                    ON p.id = ma.property_id
                WHERE ma.tenant_id = ?
                AND ma.region = ?
                AND ma.meter_id = ?
                AND ma.active = 1
                """,
                (user["id"], region, meter)
            ).fetchone()

        elif user["role"] == "owner":

            # New property-based owner access.
            assignment = connection.execute(
                """
                SELECT
                    id,
                    property_name,
                    address
                FROM properties
                WHERE owner_id = ?
                AND region = ?
                AND meter_id = ?
                """,
                (user["id"], region, meter)
            ).fetchone()

            # Preserve access to meters assigned before this update.
            if not assignment:
                assignment = connection.execute(
                    """
                    SELECT id
                    FROM meter_assignments
                    WHERE owner_id = ?
                    AND region = ?
                    AND meter_id = ?
                    AND active = 1
                    AND property_id IS NULL
                    LIMIT 1
                    """,
                    (user["id"], region, meter)
                ).fetchone()

        else:
            assignment = None

        if assignment and user["role"] == "owner":
            property_info = {
                "property_id": assignment["id"],
                "property_name": assignment["property_name"]
                if "property_name" in assignment.keys()
                else "Previously assigned meter",
                "address": assignment["address"]
                if "address" in assignment.keys()
                else ""
            }

        elif assignment and user["role"] == "tenant":
            property_info = {
                "property_id": assignment["property_id"],
                "property_name": assignment["property_name"]
                or "Assigned property",
                "address": assignment["address"] or ""
            }

    finally:
        connection.close()

    if not assignment:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this meter."
        )

    # Existing EnergyIQ calculations remain unchanged.
    history = get_meter_history(region, meter)

    recent = history.tail(30)

    forecasts = predict_next_days(
        region,
        meter,
        history,
        days=7
    )

    total_usage = float(recent["t_kwh"].sum())
    average_usage = float(recent["t_kwh"].mean())

    forecast_total = sum(
        item["predicted_kwh"] for item in forecasts
    )

    estimated_monthly_bill = (
        average_usage * 30 * TARIFF_PER_UNIT
    )

    return {
        "status": "success",
        "region": region,
        "meter": meter,
        "role": user["role"],
        "property": property_info,
        "summary": {
            "total_usage_30_days": round(total_usage, 2),
            "average_daily_usage": round(average_usage, 2),
            "predicted_usage_7_days": round(forecast_total, 2),
            "estimated_monthly_bill": round(
                estimated_monthly_bill, 2
            ),
            "tariff_per_unit": TARIFF_PER_UNIT
        },
        "history": [
            {
                "date": row.date.strftime("%Y-%m-%d"),
                "consumption_kwh": round(
                    float(row.t_kwh), 2
                )
            }
            for row in recent.itertuples()
        ],
        "forecast": forecasts
    }


# ---------------- HEALTH ----------------

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": True
    }
