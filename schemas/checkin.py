import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator
from models.enums import Quarter

class CheckinCreate(BaseModel):
    """Schema for creating a manager check-in on a goal."""
    quarter: Quarter
    comment: str
    rating: int | None = None  # 1-5

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: int | None) -> int | None:
        if v is not None and (v < 1 or v > 5):
            raise ValueError("Rating must be between 1 and 5")
        return v

    @field_validator("comment")
    @classmethod
    def validate_comment(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Comment cannot be empty")
        return v


class CheckinResponse(BaseModel):
    """Schema for check-in data in API responses."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    goal_id: uuid.UUID
    quarter: Quarter
    financial_year: str
    comment: str
    rating: int | None = None
    authored_by: uuid.UUID
    author_name: str | None = None
    created_at: datetime