
import sqlite3
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pwdlib import PasswordHash
from pydantic import BaseModel, EmailStr, Field

from database import get_db

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

SECRET_KEY = "CHANGE_THIS_TO_A_LONG_RANDOM_SECRET_BEFORE_DEPLOYMENT"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

password_hash = PasswordHash.recommended()
security = HTTPBearer()


class OwnerRegister(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TenantCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class PropertyCreate(BaseModel):
    property_name: str = Field(min_length=2, max_length=100)
    region: str
    meter_id: str
    address: str = ""


class MeterAssignment(BaseModel):
    tenant_id: int
    region: str
    meter_id: str


class PropertyAssignment(BaseModel):
    tenant_id: int
    property_id: int


def create_access_token(user_id: int):
    expires = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "exp": expires,
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired login. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        user_id = int(payload.get("sub"))

    except (JWTError, TypeError, ValueError):
        raise credentials_error

    connection = get_db()

    user = connection.execute(
        """
        SELECT id, name, email, role, owner_id
        FROM users
        WHERE id = ?
        """,
        (user_id,)
    ).fetchone()

    connection.close()

    if not user:
        raise credentials_error

    return dict(user)


def require_owner(user=Depends(get_current_user)):
    if user["role"] != "owner":
        raise HTTPException(
            status_code=403,
            detail="Owner access required."
        )
    return user


def require_tenant(user=Depends(get_current_user)):
    if user["role"] != "tenant":
        raise HTTPException(
            status_code=403,
            detail="Tenant access required."
        )
    return user


def validate_meter(region: str, meter_id: str):
    region = region.strip().title()
    meter_id = meter_id.strip()

    try:
        # Uses your existing dataset validation function.
        from main import get_meter_history
        get_meter_history(region, meter_id)

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Could not verify this meter. Check the region and meter number."
        )

    return region, meter_id


@router.post("/register")
def register_owner(data: OwnerRegister):
    connection = get_db()

    existing = connection.execute(
        "SELECT id FROM users WHERE email = ?",
        (data.email.lower(),)
    ).fetchone()

    if existing:
        connection.close()
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists."
        )

    hashed_password = password_hash.hash(data.password)

    cursor = connection.execute(
        """
        INSERT INTO users (name, email, password_hash, role)
        VALUES (?, ?, ?, 'owner')
        """,
        (
            data.name.strip(),
            data.email.lower(),
            hashed_password,
        )
    )

    user_id = cursor.lastrowid
    connection.commit()
    connection.close()

    return {
        "message": "Owner account created successfully.",
        "user_id": user_id,
    }


@router.post("/login")
def login(data: LoginRequest):
    connection = get_db()

    user = connection.execute(
        """
        SELECT id, name, email, password_hash, role, owner_id
        FROM users
        WHERE email = ?
        """,
        (data.email.lower(),)
    ).fetchone()

    connection.close()

    if not user or not password_hash.verify(
        data.password, user["password_hash"]
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password."
        )

    token = create_access_token(user["id"])

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
        },
    }


@router.get("/me")
def get_me(user=Depends(get_current_user)):
    return user


# ---------------- PROPERTY MANAGEMENT ----------------

@router.post("/properties")
def create_property(
    data: PropertyCreate,
    owner=Depends(require_owner)
):
    property_name = data.property_name.strip()

    if not property_name:
        raise HTTPException(
            status_code=400,
            detail="Property name is required."
        )

    region, meter_id = validate_meter(data.region, data.meter_id)

    connection = get_db()

    existing = connection.execute(
        """
        SELECT id FROM properties
        WHERE owner_id = ? AND LOWER(property_name) = LOWER(?)
        """,
        (owner["id"], property_name)
    ).fetchone()

    if existing:
        connection.close()
        raise HTTPException(
            status_code=409,
            detail="You already have a property with this name."
        )

    cursor = connection.execute(
        """
        INSERT INTO properties
        (owner_id, property_name, region, meter_id, address)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            owner["id"],
            property_name,
            region,
            meter_id,
            data.address.strip()
        )
    )

    property_id = cursor.lastrowid
    connection.commit()
    connection.close()

    return {
        "message": "Property added successfully.",
        "property": {
            "id": property_id,
            "property_name": property_name,
            "region": region,
            "meter_id": meter_id,
            "address": data.address.strip()
        }
    }


@router.get("/properties")
def get_properties(owner=Depends(require_owner)):
    connection = get_db()

    properties = connection.execute(
        """
        SELECT id, property_name, region, meter_id, address, created_at
        FROM properties
        WHERE owner_id = ?
        ORDER BY id DESC
        """,
        (owner["id"],)
    ).fetchall()

    connection.close()

    return {
        "total_properties": len(properties),
        "properties": [dict(item) for item in properties]
    }


@router.delete("/properties/{property_id}")
def delete_property(
    property_id: int,
    owner=Depends(require_owner)
):
    connection = get_db()

    prop = connection.execute(
        """
        SELECT id FROM properties
        WHERE id = ? AND owner_id = ?
        """,
        (property_id, owner["id"])
    ).fetchone()

    if not prop:
        connection.close()
        raise HTTPException(
            status_code=404,
            detail="Property not found."
        )

    # Keep tenant accounts, but deactivate assignments for this property.
    connection.execute(
        """
        UPDATE meter_assignments
        SET active = 0
        WHERE property_id = ? AND owner_id = ?
        """,
        (property_id, owner["id"])
    )

    connection.execute(
        "DELETE FROM properties WHERE id = ? AND owner_id = ?",
        (property_id, owner["id"])
    )

    connection.commit()
    connection.close()

    return {"message": "Property deleted successfully."}


# ---------------- TENANT MANAGEMENT ----------------

@router.post("/tenants")
def create_tenant(
    data: TenantCreate,
    owner=Depends(require_owner)
):
    connection = get_db()

    email = data.email.lower()

    existing = connection.execute(
        "SELECT id FROM users WHERE email = ?",
        (email,)
    ).fetchone()

    if existing:
        connection.close()
        raise HTTPException(
            status_code=409,
            detail="Email already registered."
        )

    hashed_password = password_hash.hash(data.password)

    cursor = connection.execute(
        """
        INSERT INTO users
        (name, email, password_hash, role, owner_id)
        VALUES (?, ?, ?, 'tenant', ?)
        """,
        (
            data.name.strip(),
            email,
            hashed_password,
            owner["id"]
        )
    )

    tenant_id = cursor.lastrowid

    connection.commit()
    connection.close()

    return {
        "message": "Tenant account created successfully.",
        "tenant_id": tenant_id,
        "name": data.name,
        "email": email
    }


@router.post("/assign-property")
def assign_property(
    data: PropertyAssignment,
    owner=Depends(require_owner)
):
    connection = get_db()

    tenant = connection.execute(
        """
        SELECT id FROM users
        WHERE id = ? AND owner_id = ? AND role = 'tenant'
        """,
        (data.tenant_id, owner["id"])
    ).fetchone()

    if not tenant:
        connection.close()
        raise HTTPException(
            status_code=404,
            detail="Tenant not found under your account."
        )

    prop = connection.execute(
        """
        SELECT id, region, meter_id
        FROM properties
        WHERE id = ? AND owner_id = ?
        """,
        (data.property_id, owner["id"])
    ).fetchone()

    if not prop:
        connection.close()
        raise HTTPException(
            status_code=404,
            detail="Property not found under your account."
        )

    try:
        connection.execute(
            """
            INSERT INTO meter_assignments
            (owner_id, tenant_id, region, meter_id, property_id, active)
            VALUES (?, ?, ?, ?, ?, 1)
            """,
            (
                owner["id"],
                data.tenant_id,
                prop["region"],
                prop["meter_id"],
                prop["id"]
            )
        )

        connection.commit()

    except sqlite3.IntegrityError:
        connection.close()
        raise HTTPException(
            status_code=409,
            detail="This tenant is already assigned to this meter."
        )

    connection.close()

    return {
        "message": "Property assigned to tenant successfully.",
        "tenant_id": data.tenant_id,
        "property_id": data.property_id,
        "region": prop["region"],
        "meter_id": prop["meter_id"]
    }


# Original meter assignment endpoint retained for compatibility.
@router.post("/assign-meter")
def assign_meter(
    data: MeterAssignment,
    owner=Depends(require_owner)
):
    region, meter_id = validate_meter(data.region, data.meter_id)

    connection = get_db()

    tenant = connection.execute(
        """
        SELECT id FROM users
        WHERE id = ? AND owner_id = ? AND role = 'tenant'
        """,
        (data.tenant_id, owner["id"])
    ).fetchone()

    if not tenant:
        connection.close()
        raise HTTPException(
            status_code=404,
            detail="Tenant not found under your account."
        )

    try:
        connection.execute(
            """
            INSERT INTO meter_assignments
            (owner_id, tenant_id, region, meter_id, active)
            VALUES (?, ?, ?, ?, 1)
            """,
            (owner["id"], data.tenant_id, region, meter_id)
        )

        connection.commit()

    except sqlite3.IntegrityError:
        connection.close()
        raise HTTPException(
            status_code=409,
            detail="This meter is already assigned to this tenant."
        )

    connection.close()

    return {
        "message": "Meter assigned successfully.",
        "tenant_id": data.tenant_id,
        "region": region,
        "meter_id": meter_id
    }


@router.get("/tenants")
def get_tenants(owner=Depends(require_owner)):
    connection = get_db()

    tenants = connection.execute(
        """
        SELECT id, name, email, created_at
        FROM users
        WHERE owner_id = ? AND role = 'tenant'
        ORDER BY id DESC
        """,
        (owner["id"],)
    ).fetchall()

    connection.close()

    return {
        "total_tenants": len(tenants),
        "tenants": [dict(t) for t in tenants]
    }


@router.get("/tenant-properties")
def get_tenant_properties(tenant=Depends(require_tenant)):
    connection = get_db()

    assignments = connection.execute(
        """
        SELECT
            ma.id AS assignment_id,
            ma.region,
            ma.meter_id,
            ma.property_id,
            p.property_name,
            p.address
        FROM meter_assignments ma
        LEFT JOIN properties p ON p.id = ma.property_id
        WHERE ma.tenant_id = ? AND ma.active = 1
        ORDER BY ma.id DESC
        """,
        (tenant["id"],)
    ).fetchall()

    connection.close()

    return {
        "total_assignments": len(assignments),
        "properties": [dict(item) for item in assignments]
    }
    