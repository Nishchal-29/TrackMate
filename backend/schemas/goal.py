import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, field_validator
from models.enums import UomType
from schemas.achievement import AchievementResponse

class GoalCreate(BaseModel):
    """Schema for adding a goal to a sheet."""
    thrust_area: str
    title: str
    description: str | None = None
    uom_type: UomType
    target_value: Decimal | None = None
    target_date: date | None = None
    weightage: Decimal

    @field_validator("weightage")
    @classmethod
    def validate_weightage(cls, v: Decimal) -> Decimal:
        if v < Decimal("10.00"):
            raise ValueError("Weightage must be at least 10.00")
        if v > Decimal("100.00"):
            raise ValueError("Weightage cannot exceed 100.00")
        return v

    @field_validator("target_value")
    @classmethod
    def validate_target_value(cls, v: Decimal | None, info) -> Decimal | None:
        if v is not None and v <= 0:
            raise ValueError("Target value must be positive")
        return v


class GoalUpdate(BaseModel):
    """Schema for updating a goal (partial update)."""
    thrust_area: str | None = None
    title: str | None = None
    description: str | None = None
    uom_type: UomType | None = None
    target_value: Decimal | None = None
    target_date: date | None = None
    weightage: Decimal | None = None
    order_index: int | None = None
    reason: str | None = None 

    @field_validator("weightage")
    @classmethod
    def validate_weightage(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and v < Decimal("10.00"):
            raise ValueError("Weightage must be at least 10.00")
        return v


class GoalResponse(BaseModel):
    """Schema for goal data in API responses."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sheet_id: uuid.UUID
    thrust_area: str
    title: str
    description: str | None = None
    uom_type: UomType
    target_value: Decimal | None = None
    target_date: date | None = None
    weightage: Decimal
    order_index: int
    parent_goal_id: uuid.UUID | None = None
    is_title_locked: bool
    is_target_locked: bool
    created_at: datetime
    updated_at: datetime
    achievements: list[AchievementResponse] = []

class PushGoalRequest(BaseModel):
    """Schema for admin/manager pushing a shared KPI to employees."""
    title: str
    thrust_area: str
    target_value: Decimal | None = None
    target_date: date | None = None
    uom_type: UomType
    description: str | None = None
    employee_ids: list[uuid.UUID]
    financial_year: str

    @field_validator("employee_ids")
    @classmethod
    def validate_employee_ids(cls, v: list[uuid.UUID]) -> list[uuid.UUID]:
        if not v:
            raise ValueError("At least one employee must be specified")
        return v

class PushGoalResponse(BaseModel):
    """Response after pushing a shared goal."""
    master_goal_id: uuid.UUID
    pushed_to: int
    failed: list[dict] = []
    message: str