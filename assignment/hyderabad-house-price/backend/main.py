"""
Hyderabad House Price Prediction - FastAPI Backend
"""

import os
import logging
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field

# ─────────────────────────────────────────────
# SETUP
# ─────────────────────────────────────────────
load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Hyderabad House Price Prediction API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
JWT_SECRET = os.getenv("JWT_SECRET", "changeme-use-a-real-secret-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24  # 24 hours

# ─────────────────────────────────────────────
# LOAD ML ARTIFACTS
# ─────────────────────────────────────────────
ARTIFACTS_DIR = Path(__file__).parent.parent / "ml" / "artifacts"
model_pipeline = joblib.load(ARTIFACTS_DIR / "model.pkl")
known_locations = joblib.load(ARTIFACTS_DIR / "locations.pkl")
logger.info(f"Model loaded. Known locations: {len(known_locations)}")

# ─────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()

# In-memory user store (replace with a real DB in production)
users_db: dict[str, dict] = {}


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> str:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ─────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────
class BuildingStatus(str, Enum):
    under_construction = "under_construction"
    ready_to_move = "ready_to_move"


class SignupRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)


class LoginRequest(BaseModel):
    username: str
    password: str


class PredictRequest(BaseModel):
    location: str = Field(..., description="Location slug e.g. gachibowli")
    building_status: str = Field(..., description="under_construction or ready_to_move")
    bhk: int = Field(..., ge=1, le=10)
    area_insqft: float = Field(..., gt=0)
    budget: float = Field(..., gt=0, description="User budget in Lakhs")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PredictResponse(BaseModel):
    predicted_price: float
    budget: float
    budget_status: str
    location: str
    bhk: int
    area_insqft: float
    building_status: str


# ─────────────────────────────────────────────
# NORMALIZATION UTILS
# ─────────────────────────────────────────────
def normalize_input(raw: str) -> str:
    return raw.lower().strip().replace(" ", "_")


def validate_building_status(raw: str) -> str:
    normalized = normalize_input(raw)
    allowed = {e.value for e in BuildingStatus}
    if normalized not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid building_status '{raw}'. Must be one of: {list(allowed)}"
        )
    return normalized


def resolve_location(raw: str) -> str:
    normalized = normalize_input(raw)
    if normalized in known_locations:
        return normalized
    return "other"  # OneHotEncoder handles unknown with handle_unknown='ignore'


# ─────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "Hyderabad House Price Prediction API"}


@app.post("/signup", status_code=201)
def signup(req: SignupRequest):
    if req.username in users_db:
        raise HTTPException(status_code=409, detail="Username already exists")
    users_db[req.username] = {"password": hash_password(req.password)}
    logger.info(f"[SIGNUP] New user: {req.username}")
    return {"message": "Account created successfully"}


@app.post("/login", response_model=TokenResponse)
def login(req: LoginRequest):
    user = users_db.get(req.username)
    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"sub": req.username})
    logger.info(f"[LOGIN] {req.username}")
    return TokenResponse(access_token=token)


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest, username: str = Depends(get_current_user)):
    # Step 1: Log raw input
    logger.info(f"[PREDICT] Raw Input → location={req.location}, "
                f"building_status={req.building_status}, bhk={req.bhk}, "
                f"area={req.area_insqft}")

    # Step 2: Normalize & validate
    norm_status = validate_building_status(req.building_status)
    norm_location = resolve_location(req.location)

    logger.info(f"[PREDICT] Normalized → location={norm_location}, status={norm_status}")

    # Step 3: Build feature DataFrame (must match training columns)
    area_per_bhk = req.area_insqft / req.bhk
    # Estimate rate_persqft from area (use median from training if not provided)
    # We ask for it from the frontend; if not supplied, use median 4500
    rate_persqft = getattr(req, "rate_persqft", 4500)

    input_df = pd.DataFrame([{
        "location": norm_location,
        "building_status": norm_status,
        "bhk": req.bhk,
        "area_insqft": req.area_insqft,
        "rate_persqft": rate_persqft,
        "area_per_bhk": area_per_bhk,
    }])

    logger.info(f"[PREDICT] Encoded Vector (pre-model):\n{input_df.to_dict('records')[0]}")

    # Step 4: Predict
    predicted = float(model_pipeline.predict(input_df)[0])
    predicted = round(max(predicted, 1.0), 2)

    # Step 5: Budget comparison
    budget = req.budget
    ratio = predicted / budget if budget > 0 else 1.0

    if ratio <= 1.0:
        if ratio < 0.8:
            budget_status = "below_expected"
        else:
            budget_status = "within_budget"
    else:
        budget_status = "above_budget"

    logger.info(f"[PREDICT] Result → {predicted:.2f}L | Budget: {budget}L | Status: {budget_status}")

    return PredictResponse(
        predicted_price=predicted,
        budget=budget,
        budget_status=budget_status,
        location=norm_location,
        bhk=req.bhk,
        area_insqft=req.area_insqft,
        building_status=norm_status,
    )


@app.get("/locations")
def get_locations():
    """Return the list of known locations for the frontend dropdown."""
    return {"locations": sorted(known_locations)}
