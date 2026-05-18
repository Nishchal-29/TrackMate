import json
import logging
import os
import uuid
from typing import Annotated

import httpx
import jwt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.user import User
from models.enums import UserRole
from schemas.user import CurrentUser

logger = logging.getLogger(__name__)

AZURE_TENANT_ID = os.getenv("AZURE_TENANT_ID", "")
AZURE_CLIENT_ID = os.getenv("AZURE_CLIENT_ID", "")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
JWKS_URI = "https://login.microsoftonline.com/common/discovery/v2.0/keys"

_jwks_cache: dict | None = None

async def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(JWKS_URI)
            response.raise_for_status()
            _jwks_cache = response.json()
            return _jwks_cache
    except Exception as e:
        logger.error(f"Failed to fetch JWKS: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable",
        )


async def _validate_token(token: str) -> dict:
    try:
        jwks = await _get_jwks()
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        rsa_key = None
        for key in jwks.get("keys", []):
            if key["kid"] == kid:
                rsa_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
                break

        if rsa_key is None:
            global _jwks_cache
            _jwks_cache = None
            jwks = await _get_jwks()
            for key in jwks.get("keys", []):
                if key["kid"] == kid:
                    rsa_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
                    break

        if rsa_key is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to find appropriate signing key",
            )

        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=AZURE_CLIENT_ID,
            options={"verify_iss": False},
        )
        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )

async def _upsert_user(
    db: AsyncSession,
    azure_oid: str,
    email: str,
    full_name: str,
    role: UserRole = UserRole.employee,
) -> User:
    result = await db.execute(
        select(User).where(User.azure_oid == azure_oid)
    )
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            azure_oid=azure_oid,
            email=email,
            full_name=full_name,
            role=role,
        )
        db.add(user)
        await db.flush()
        logger.info(f"Auto-provisioned user: {email} (oid={azure_oid})")

    return user

async def get_current_user(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CurrentUser:
    auth_header = request.headers.get("Authorization", "")
    _azure_configured = AZURE_TENANT_ID and not AZURE_TENANT_ID.startswith("your-")
    if ENVIRONMENT == "development" and (not _azure_configured or not auth_header):
        dev_email = request.headers.get("X-Dev-User-Email", "dev@example.com")
        dev_role = request.headers.get("X-Dev-User-Role", "admin")
        dev_name = request.headers.get("X-Dev-User-Name", "Dev User")

        result = await db.execute(
            select(User).where(User.email == dev_email)
        )
        user = result.scalar_one_or_none()

        if user is None:
            user = User(
                azure_oid=f"dev-{uuid.uuid4().hex[:8]}",
                email=dev_email,
                full_name=dev_name,
                role=UserRole(dev_role),
            )
            db.add(user)
            await db.flush()

        current_user = CurrentUser(
            id=user.id,
            azure_oid=user.azure_oid,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            department=user.department,
            manager_id=user.manager_id,
        )
        request.state.user = current_user
        return current_user

    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header.split(" ", 1)[1]
    try:
        unverified = jwt.decode(token, options={"verify_signature": False})
        is_local = unverified.get("iss") == "trackmate-local"
    except Exception:
        is_local = False

    if is_local:
        _jwt_secret = os.getenv("JWT_SECRET", "trackmate-local-jwt-secret-change-in-production")
        try:
            payload = jwt.decode(token, _jwt_secret, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError as e:
            raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

        user_id = payload.get("sub")
        result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
        user = result.scalar_one_or_none()
        if user is None or not user.is_active:
            raise HTTPException(status_code=401, detail="User not found or deactivated")

    else:
        payload = await _validate_token(token)

        azure_oid = payload.get("oid", "")
        email = payload.get("preferred_username") or payload.get("email", "")
        full_name = payload.get("name", email.split("@")[0])

        roles = payload.get("roles", [])
        if "Admin" in roles or "admin" in roles:
            role = UserRole.admin
        elif "Manager" in roles or "manager" in roles:
            role = UserRole.manager
        else:
            role = UserRole.employee

        user = await _upsert_user(db, azure_oid, email, full_name, role)

    current_user = CurrentUser(
        id=user.id,
        azure_oid=user.azure_oid,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        department=user.department,
        manager_id=user.manager_id,
    )
    request.state.user = current_user
    return current_user

def require_role(*roles: UserRole):
    async def _check_role(
        current_user: Annotated[CurrentUser, Depends(get_current_user)],
    ) -> CurrentUser:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of: {[r.value for r in roles]}",
            )
        return current_user
    return _check_role

require_employee = require_role(UserRole.employee, UserRole.manager, UserRole.admin)
require_manager = require_role(UserRole.manager, UserRole.admin)
require_admin = require_role(UserRole.admin)