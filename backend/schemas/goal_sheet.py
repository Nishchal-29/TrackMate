import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from models.enums import GoalSheetStatus

class GoalSheetCreate(BaseModel):
    """Schema for creating a new draft goal sheet."""
    financial_year: str 

class GoalSheetResponse(BaseModel):
    """Schema for goal sheet data in API responses."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    employee_id: uuid.UUID
    financial_year: str
    status: GoalSheetStatus
    submitted_at: datetime | None = None
    approved_at: datetime | None = None
    approved_by: uuid.UUID | None = None
    locked: bool
    created_at: datetime
    updated_at: datetime
    goals: list["GoalResponse"] = []

class GoalSheetWithEmployee(GoalSheetResponse):
    """Goal sheet response with employee info (for manager/admin views)."""
    employee_name: str | None = None
    employee_email: str | None = None
    employee_department: str | None = None


class GoalSheetSubmitResponse(BaseModel):
    """Response after submitting a goal sheet."""
    id: uuid.UUID
    status: GoalSheetStatus
    submitted_at: datetime
    message: str = "Goal sheet submitted for approval."


class GoalSheetApprovalRequest(BaseModel):
    """Request body for rejecting a goal sheet (reason required)."""
    reason: str


class GoalSheetUnlockRequest(BaseModel):
    """Request body for unlocking a goal sheet (admin only, reason required)."""
    reason: str

from schemas.goal import GoalResponse  
GoalSheetResponse.model_rebuild()
GoalSheetWithEmployee.model_rebuild()