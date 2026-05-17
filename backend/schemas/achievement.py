import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict
from models.enums import Quarter

class AchievementCreate(BaseModel):
    quarter: Quarter
    financial_year: str
    actual_value: Decimal | None = None
    actual_date: date | None = None
    notes: str | None = None

class AchievementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    goal_id: uuid.UUID
    quarter: Quarter
    financial_year: str
    actual_value: Decimal | None = None
    actual_date: date | None = None
    score: Decimal | None = None
    submitted_by: uuid.UUID
    submitted_at: datetime
    notes: str | None = None
    created_at: datetime

class AchievementSummary(BaseModel):
    goal_id: uuid.UUID
    goal_title: str
    target_value: Decimal | None = None
    target_date: date | None = None
    uom_type: str
    weightage: Decimal
    quarters: dict[str, AchievementResponse | None] = {}