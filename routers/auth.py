import hashlib
import hmac
import logging
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.user import User
from models.enums import UserRole

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

JWT_SECRET = os.getenv("JWT_SECRET", "trackmate-local-jwt-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "employee"  # employee | manager | admin
    department: str | None = None
    manager_email: str | None = None  # Resolved to manager_id


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
def _hash_password(password: str) -> str:
    salt = "trackmate-salt"
    return hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()


def _verify_password(password: str, hashed: str) -> bool:
    return hmac.compare_digest(_hash_password(password), hashed)


def _create_token(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "name": user.full_name,
        "role": user.role.value,
        "iss": "trackmate-local",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register with email/password",
)
async def register(
    body: RegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Register a new local user account."""
    result = await db.execute(select(User).where(User.email == body.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    try:
        role = UserRole(body.role)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid role: {body.role}")

    # Resolve manager_email to manager_id
    manager_id = None
    if body.manager_email:
        mgr_result = await db.execute(
            select(User).where(User.email == body.manager_email)
        )
        manager = mgr_result.scalar_one_or_none()
        if manager is None:
            raise HTTPException(status_code=422, detail=f"Manager not found: {body.manager_email}")
        manager_id = manager.id

    user = User(
        azure_oid=f"local-{uuid.uuid4().hex[:12]}",
        email=body.email,
        full_name=body.full_name,
        role=role,
        department=body.department,
        manager_id=manager_id,
        password_hash=_hash_password(body.password),
    )
    db.add(user)
    await db.flush()

    token = _create_token(user)
    return AuthResponse(
        access_token=token,
        user={
            "id": str(user.id),
            "email": user.email,
            "name": user.full_name,
            "role": user.role.value,
            "department": user.department,
        },
    )


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Login with email/password",
)
async def login(
    body: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Authenticate with email/password for users without Entra ID."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.password_hash:
        raise HTTPException(
            status_code=401,
            detail="This account uses Microsoft SSO. Please sign in with Microsoft.",
        )

    if not _verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    token = _create_token(user)
    return AuthResponse(
        access_token=token,
        user={
            "id": str(user.id),
            "email": user.email,
            "name": user.full_name,
            "role": user.role.value,
        },
    )


@router.get("/me", summary="Get current user profile")
async def get_me(
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get the currently authenticated user's profile.
    This is a simple endpoint — the actual auth is handled in the middleware.
    """
    return {"message": "Use the main API with auth headers to get user info"}
