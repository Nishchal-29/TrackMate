import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict
from models.enums import GoalSheetStatus, Quarter

class QuarterlyCycleCreate(BaseModel):
    """Schema for creating a quarterly cycle configuration."""
    financial_year: str
    quarter: Quarter
    tracking_opens_at: datetime
    tracking_closes_at: datetime
    is_active: bool = True


class QuarterlyCycleUpdate(BaseModel):
    """Schema for updating a quarterly cycle (partial)."""
    tracking_opens_at: datetime | None = None
    tracking_closes_at: datetime | None = None
    is_active: bool | None = None


class QuarterlyCycleResponse(BaseModel):
    """Schema for quarterly cycle in API responses."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    financial_year: str
    quarter: Quarter
    tracking_opens_at: datetime
    tracking_closes_at: datetime
    is_active: bool
    created_by: uuid.UUID


class EscalationRuleCreate(BaseModel):
    """Schema for creating an escalation rule."""
    trigger_event: str
    threshold_hours: int
    escalate_to_role: str
    notification_template: str
    is_active: bool = True


class EscalationRuleResponse(BaseModel):
    """Schema for escalation rule in API responses."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    trigger_event: str
    threshold_hours: int
    escalate_to_role: str
    notification_template: str
    is_active: bool
    created_by: uuid.UUID


class AuditLogResponse(BaseModel):
    """Schema for audit log entries in API responses."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    entity_type: str
    entity_id: uuid.UUID
    action: str
    actor_id: uuid.UUID
    actor_role: str
    delta: dict | None = None
    ip_address: str | None = None
    timestamp: datetime
    reason: str | None = None


class DashboardStats(BaseModel):
    """Schema for admin dashboard overview statistics."""
    total_employees: int
    total_sheets: int
    sheets_submitted_pct: Decimal
    sheets_approved_pct: Decimal
    avg_org_score: Decimal | None = None
    department_scores: list["DepartmentScore"] = []
    quarter_trends: list["QuarterTrend"] = []


class DepartmentScore(BaseModel):
    """Average score per department."""
    department: str | None
    avg_score: Decimal | None
    employee_count: int


class QuarterTrend(BaseModel):
    """Score trend per quarter."""
    quarter: str
    financial_year: str
    avg_score: Decimal | None


class TeamMemberStatus(BaseModel):
    """Team member status for manager dashboard."""
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    full_name: str
    email: str
    department: str | None = None
    sheet_status: GoalSheetStatus | None = None
    goals_count: int = 0
    total_weightage: Decimal = Decimal("0")
    avg_score: Decimal | None = None

DashboardStats.model_rebuild()