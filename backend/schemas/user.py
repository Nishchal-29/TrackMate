import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr
from models.enums import UserRole

class UserBase(BaseModel):
    """Shared user fields."""
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.employee
    department: str | None = None
    manager_id: uuid.UUID | None = None


class UserCreate(UserBase):
    """Schema for creating a user (admin endpoint)."""
    azure_oid: str


class UserUpdate(BaseModel):
    """Schema for updating a user (partial update)."""
    full_name: str | None = None
    role: UserRole | None = None
    department: str | None = None
    manager_id: uuid.UUID | None = None
    is_active: bool | None = None


class UserResponse(BaseModel):
    """Schema for user data in API responses."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    azure_oid: str
    email: str
    full_name: str
    role: UserRole
    manager_id: uuid.UUID | None = None
    department: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserBrief(BaseModel):
    """Minimal user info for embedding in other responses."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    department: str | None = None


class CurrentUser(BaseModel):
    """Dataclass-like model for the authenticated user attached to request.state."""
    id: uuid.UUID
    azure_oid: str
    email: str
    full_name: str
    role: UserRole
    department: str | None = None
    manager_id: uuid.UUID | None = None