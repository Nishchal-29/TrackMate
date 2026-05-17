import uuid
from datetime import datetime
from typing import Any, Generic, TypeVar
from pydantic import BaseModel, ConfigDict
T = TypeVar("T")

class ErrorResponse(BaseModel):
    """Structured error response returned by all API endpoints."""
    detail: str
    code: str
    context: dict[str, Any] | None = None


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response wrapper."""
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class PaginationParams(BaseModel):
    """Query parameters for pagination."""
    page: int = 1
    page_size: int = 20


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    db: str


class BaseSchema(BaseModel):
    """Base schema with common configuration for all response models."""
    model_config = ConfigDict(from_attributes=True)


class TimestampMixin(BaseModel):
    """Mixin for models with created_at/updated_at."""
    created_at: datetime
    updated_at: datetime | None = None