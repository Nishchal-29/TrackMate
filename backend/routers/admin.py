import logging
import uuid
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, text, case
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth import get_current_user, require_admin
from models.user import User
from models.goal import Goal
from models.goal_sheet import GoalSheet
from models.achievement import Achievement
from models.audit_log import AuditLog
from models.quarterly_cycle import QuarterlyCycle
from models.escalation_rule import EscalationRule
from models.enums import UserRole, GoalSheetStatus
from schemas.user import UserCreate, UserUpdate, UserResponse, CurrentUser
from schemas.admin import (
    QuarterlyCycleCreate, QuarterlyCycleUpdate, QuarterlyCycleResponse,
    EscalationRuleCreate, EscalationRuleResponse,
    AuditLogResponse, DashboardStats, DepartmentScore, QuarterTrend,
)
from services.audit import write_audit_log

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get(
    "/users",
    response_model=list[UserResponse],
    summary="List all users",
)
async def list_users(
    current_user: Annotated[CurrentUser, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    department: str | None = None,
    role: UserRole | None = None,
    search: str | None = None,
    is_active: bool | None = None,
):
    query = select(User).order_by(User.full_name)

    if department:
        query = query.where(User.department == department)
    if role:
        query = query.where(User.role == role)
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    if search:
        query = query.where(
            User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        )

    result = await db.execute(query)
    return result.scalars().all()


@router.post(
    "/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a user",
)
async def create_user(
    body: UserCreate,
    current_user: Annotated[CurrentUser, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new user (admin only)."""
    existing = await db.execute(
        select(User).where(
            (User.email == body.email) | (User.azure_oid == body.azure_oid)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="User with this email or Azure OID already exists.")

    user = User(
        azure_oid=body.azure_oid,
        email=body.email,
        full_name=body.full_name,
        role=body.role,
        department=body.department,
        manager_id=body.manager_id,
    )
    db.add(user)
    await db.flush()

    await write_audit_log(
        db, "user", user.id, "create",
        current_user.id, current_user.role.value,
    )

    return user


@router.patch(
    "/users/{user_id}",
    response_model=UserResponse,
    summary="Update a user",
)
async def update_user(
    user_id: uuid.UUID,
    body: UserUpdate,
    current_user: Annotated[CurrentUser, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update user details (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    update_data = body.model_dump(exclude_unset=True)
    old_values = {k: getattr(user, k) for k in update_data}

    for key, value in update_data.items():
        setattr(user, key, value)
    await db.flush()

    from services.audit import compute_delta
    delta = compute_delta(old_values, update_data)
    if delta:
        await write_audit_log(
            db, "user", user.id, "update",
            current_user.id, current_user.role.value,
            delta=delta,
        )

    return user

@router.get(
    "/quarterly-cycles",
    response_model=list[QuarterlyCycleResponse],
    summary="List all quarterly cycles",
)
async def list_cycles(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List all quarterly cycle configurations."""
    result = await db.execute(
        select(QuarterlyCycle).order_by(
            QuarterlyCycle.financial_year.desc(),
            QuarterlyCycle.quarter,
        )
    )
    return result.scalars().all()


@router.post(
    "/quarterly-cycles",
    response_model=QuarterlyCycleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a quarterly cycle",
)
async def create_cycle(
    body: QuarterlyCycleCreate,
    current_user: Annotated[CurrentUser, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new quarterly cycle configuration (admin only)."""
    cycle = QuarterlyCycle(
        financial_year=body.financial_year,
        quarter=body.quarter,
        tracking_opens_at=body.tracking_opens_at,
        tracking_closes_at=body.tracking_closes_at,
        is_active=body.is_active,
        created_by=current_user.id,
    )
    db.add(cycle)
    await db.flush()
    return cycle


@router.patch(
    "/quarterly-cycles/{cycle_id}",
    response_model=QuarterlyCycleResponse,
    summary="Update a quarterly cycle",
)
async def update_cycle(
    cycle_id: uuid.UUID,
    body: QuarterlyCycleUpdate,
    current_user: Annotated[CurrentUser, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update a quarterly cycle configuration (admin only)."""
    result = await db.execute(
        select(QuarterlyCycle).where(QuarterlyCycle.id == cycle_id)
    )
    cycle = result.scalar_one_or_none()
    if cycle is None:
        raise HTTPException(status_code=404, detail="Quarterly cycle not found.")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(cycle, key, value)
    await db.flush()

    return cycle

@router.get(
    "/escalation-rules",
    response_model=list[EscalationRuleResponse],
    summary="List escalation rules",
)
async def list_escalation_rules(
    current_user: Annotated[CurrentUser, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List all escalation rules (admin only)."""
    result = await db.execute(select(EscalationRule))
    return result.scalars().all()


@router.post(
    "/escalation-rules",
    response_model=EscalationRuleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an escalation rule",
)
async def create_escalation_rule(
    body: EscalationRuleCreate,
    current_user: Annotated[CurrentUser, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new escalation rule (admin only)."""
    rule = EscalationRule(
        trigger_event=body.trigger_event,
        threshold_hours=body.threshold_hours,
        escalate_to_role=body.escalate_to_role,
        notification_template=body.notification_template,
        is_active=body.is_active,
        created_by=current_user.id,
    )
    db.add(rule)
    await db.flush()
    return rule

@router.get(
    "/dashboard",
    response_model=DashboardStats,
    summary="Org-wide dashboard statistics",
)
async def get_dashboard(
    current_user: Annotated[CurrentUser, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    financial_year: str = "FY2025-26",
    quarter: str | None = None,
):
    """
    Get organization-wide completion statistics.
    Uses a CTE for optimized querying.
    """
    emp_count_result = await db.execute(
        select(func.count(User.id)).where(User.is_active == True)
    )
    total_employees = emp_count_result.scalar_one()

    total_sheets_result = await db.execute(
        select(func.count(GoalSheet.id)).where(
            GoalSheet.financial_year == financial_year
        )
    )
    total_sheets = total_sheets_result.scalar_one()

    submitted_result = await db.execute(
        select(func.count(GoalSheet.id)).where(
            GoalSheet.financial_year == financial_year,
            GoalSheet.status.in_([
                GoalSheetStatus.pending_approval,
                GoalSheetStatus.approved,
            ]),
        )
    )
    submitted_count = submitted_result.scalar_one()

    approved_result = await db.execute(
        select(func.count(GoalSheet.id)).where(
            GoalSheet.financial_year == financial_year,
            GoalSheet.status == GoalSheetStatus.approved,
        )
    )
    approved_count = approved_result.scalar_one()

    sheets_submitted_pct = (
        Decimal(str(submitted_count)) / Decimal(str(max(total_employees, 1))) * 100
    ).quantize(Decimal("0.01"))

    sheets_approved_pct = (
        Decimal(str(approved_count)) / Decimal(str(max(total_employees, 1))) * 100
    ).quantize(Decimal("0.01"))

    avg_score_query = (
        select(func.avg(Achievement.score))
        .join(Goal, Goal.id == Achievement.goal_id)
        .join(GoalSheet, GoalSheet.id == Goal.sheet_id)
        .where(GoalSheet.financial_year == financial_year)
    )
    if quarter:
        avg_score_query = avg_score_query.where(Achievement.quarter == quarter)

    avg_score_result = await db.execute(avg_score_query)
    avg_org_score = avg_score_result.scalar_one_or_none()

    dept_query = (
        select(
            User.department,
            func.avg(Achievement.score).label("avg_score"),
            func.count(func.distinct(User.id)).label("employee_count"),
        )
        .join(GoalSheet, GoalSheet.employee_id == User.id)
        .join(Goal, Goal.sheet_id == GoalSheet.id)
        .join(Achievement, Achievement.goal_id == Goal.id)
        .where(
            GoalSheet.financial_year == financial_year,
            User.is_active == True,
        )
        .group_by(User.department)
        .order_by(User.department)
    )
    if quarter:
        dept_query = dept_query.where(Achievement.quarter == quarter)

    dept_result = await db.execute(dept_query)
    department_scores = [
        DepartmentScore(
            department=row.department,
            avg_score=Decimal(str(row.avg_score)).quantize(Decimal("0.01")) if row.avg_score else None,
            employee_count=row.employee_count,
        )
        for row in dept_result.all()
    ]

    trend_query = (
        select(
            Achievement.quarter,
            Achievement.financial_year,
            func.avg(Achievement.score).label("avg_score"),
        )
        .join(Goal, Goal.id == Achievement.goal_id)
        .join(GoalSheet, GoalSheet.id == Goal.sheet_id)
        .where(GoalSheet.financial_year == financial_year)
        .group_by(Achievement.quarter, Achievement.financial_year)
        .order_by(Achievement.quarter)
    )
    trend_result = await db.execute(trend_query)
    quarter_trends = [
        QuarterTrend(
            quarter=row.quarter.value if hasattr(row.quarter, 'value') else row.quarter,
            financial_year=row.financial_year,
            avg_score=Decimal(str(row.avg_score)).quantize(Decimal("0.01")) if row.avg_score else None,
        )
        for row in trend_result.all()
    ]

    return DashboardStats(
        total_employees=total_employees,
        total_sheets=total_sheets,
        sheets_submitted_pct=sheets_submitted_pct,
        sheets_approved_pct=sheets_approved_pct,
        avg_org_score=Decimal(str(avg_org_score)).quantize(Decimal("0.01")) if avg_org_score else None,
        department_scores=department_scores,
        quarter_trends=quarter_trends,
    )

@router.get(
    "/audit-logs",
    response_model=list[AuditLogResponse],
    summary="View audit logs (admin only)",
)
async def get_audit_logs(
    current_user: Annotated[CurrentUser, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
    actor_id: uuid.UUID | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
):
    """
    Get paginated audit logs with optional filters.
    Admin only — no other roles have direct audit log access.
    """
    query = select(AuditLog).order_by(AuditLog.timestamp.desc())

    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.where(AuditLog.entity_id == entity_id)
    if actor_id:
        query = query.where(AuditLog.actor_id == actor_id)

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    result = await db.execute(query)
    return result.scalars().all()