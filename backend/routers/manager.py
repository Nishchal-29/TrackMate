import logging
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from middleware.auth import get_current_user, require_manager
from models.user import User
from models.goal import Goal
from models.goal_sheet import GoalSheet
from models.achievement import Achievement
from models.checkin import Checkin
from models.quarterly_cycle import QuarterlyCycle
from models.enums import UserRole
from schemas.admin import TeamMemberStatus
from schemas.goal_sheet import GoalSheetResponse
from schemas.checkin import CheckinCreate, CheckinResponse
from schemas.user import CurrentUser
from services.audit import write_audit_log

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/manager", tags=["Manager"])

@router.get(
    "/team",
    response_model=list[TeamMemberStatus],
    summary="List direct reports with sheet status",
)
async def get_team(
    current_user: Annotated[CurrentUser, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
    financial_year: str | None = None,
):
    if current_user.role == UserRole.admin:
        query = select(User).where(
            User.is_active == True,
            User.id != current_user.id,
        )
    else:
        query = select(User).where(
            User.manager_id == current_user.id,
            User.is_active == True,
        )
    result = await db.execute(query)
    reports = result.scalars().all()

    team_status = []
    for user in reports:
        sheet_query = select(GoalSheet).where(GoalSheet.employee_id == user.id)
        if financial_year:
            sheet_query = sheet_query.where(GoalSheet.financial_year == financial_year)
        sheet_query = sheet_query.order_by(GoalSheet.created_at.desc()).limit(1)

        sheet_result = await db.execute(sheet_query)
        sheet = sheet_result.scalar_one_or_none()
        goals_count = 0
        total_weightage = Decimal("0")
        avg_score = None

        if sheet:
            goal_stats = await db.execute(
                select(
                    func.count(Goal.id),
                    func.sum(Goal.weightage),
                ).where(Goal.sheet_id == sheet.id)
            )
            row = goal_stats.one()
            goals_count = row[0] or 0
            total_weightage = row[1] or Decimal("0")
            score_result = await db.execute(
                select(func.sum((Achievement.score * Goal.weightage) / 100))
                .join(Goal, Goal.id == Achievement.goal_id)
                .where(Goal.sheet_id == sheet.id)
            )
            avg_score = score_result.scalar_one_or_none()

        team_status.append(TeamMemberStatus(
            user_id=user.id,
            full_name=user.full_name,
            email=user.email,
            department=user.department,
            sheet_id=sheet.id if sheet else None,
            sheet_status=sheet.status if sheet else None,
            goals_count=goals_count,
            total_weightage=total_weightage,
            avg_score=Decimal(str(avg_score)).quantize(Decimal("0.01")) if avg_score else None,
        ))

    return team_status

@router.get(
    "/team/{employee_id}/sheet",
    response_model=GoalSheetResponse,
    summary="Get employee's full goal sheet",
)
async def get_employee_sheet(
    employee_id: uuid.UUID,
    current_user: Annotated[CurrentUser, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
    financial_year: str | None = None,
):
    if current_user.role != UserRole.admin:
        emp_result = await db.execute(
            select(User).where(User.id == employee_id)
        )
        employee = emp_result.scalar_one_or_none()
        if employee is None:
            raise HTTPException(status_code=404, detail="Employee not found.")
        if employee.manager_id != current_user.id:
            raise HTTPException(status_code=403, detail="This employee is not your direct report.")

    query = (
        select(GoalSheet)
        .where(GoalSheet.employee_id == employee_id)
        .options(selectinload(GoalSheet.goals).selectinload(Goal.achievements))
    )
    if financial_year:
        query = query.where(GoalSheet.financial_year == financial_year)
    query = query.order_by(GoalSheet.created_at.desc()).limit(1)

    result = await db.execute(query)
    sheet = result.scalar_one_or_none()

    if sheet is None:
        raise HTTPException(status_code=404, detail="No goal sheet found for this employee.")

    return sheet

@router.post(
    "/team/{employee_id}/goals/{goal_id}/checkin",
    response_model=CheckinResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log a structured check-in",
)
async def create_checkin(
    employee_id: uuid.UUID,
    goal_id: uuid.UUID,
    body: CheckinCreate,
    current_user: Annotated[CurrentUser, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    if current_user.role != UserRole.admin:
        emp_result = await db.execute(
            select(User).where(User.id == employee_id)
        )
        employee = emp_result.scalar_one_or_none()
        if employee is None:
            raise HTTPException(status_code=404, detail="Employee not found.")
        if employee.manager_id != current_user.id:
            raise HTTPException(status_code=403, detail="This employee is not your direct report.")

    result = await db.execute(
        select(Goal)
        .where(Goal.id == goal_id)
        .options(selectinload(Goal.sheet))
    )
    goal = result.scalar_one_or_none()
    if goal is None or goal.sheet.employee_id != employee_id:
        raise HTTPException(status_code=404, detail="Goal not found for this employee.")

    financial_year = goal.sheet.financial_year
    checkin = Checkin(
        goal_id=goal_id,
        quarter=body.quarter,
        financial_year=financial_year,
        comment=body.comment,
        rating=body.rating,
        authored_by=current_user.id,
    )
    db.add(checkin)
    await db.flush()

    await write_audit_log(
        db, "checkin", checkin.id, "create",
        current_user.id, current_user.role.value,
    )

    return CheckinResponse(
        id=checkin.id,
        goal_id=checkin.goal_id,
        quarter=checkin.quarter,
        financial_year=checkin.financial_year,
        comment=checkin.comment,
        rating=checkin.rating,
        authored_by=checkin.authored_by,
        author_name=current_user.full_name,
        created_at=checkin.created_at,
    )