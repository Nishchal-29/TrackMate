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
from models.enums import UserRole, GoalSheetStatus
from schemas.admin import TeamMemberStatus
from schemas.goal import CascadeGoalRequest, PushGoalResponse
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

@router.post(
    "/goals/{goal_id}/cascade",
    response_model=PushGoalResponse,
    summary="Cascade a manager's goal to direct reports",
)
async def cascade_goal(
    goal_id: uuid.UUID,
    body: CascadeGoalRequest,
    current_user: Annotated[CurrentUser, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    # 1. Fetch the Manager's Goal to ensure they own it
    result = await db.execute(
        select(Goal)
        .join(GoalSheet, GoalSheet.id == Goal.sheet_id)
        .where(Goal.id == goal_id, GoalSheet.employee_id == current_user.id)
    )
    manager_goal = result.scalar_one_or_none()
    
    if not manager_goal:
        raise HTTPException(status_code=404, detail="Goal not found or you do not own it.")

    # 2. Fetch the Manager's Goal Sheet to get the financial year
    sheet_result = await db.execute(select(GoalSheet).where(GoalSheet.id == manager_goal.sheet_id))
    manager_sheet = sheet_result.scalar_one()

    cascaded_count = 0
    failed = []

    # 3. Cascade to the selected employees
    for employee_id in body.employee_ids:
        try:
            # Verify this employee actually reports to this manager
            emp_result = await db.execute(select(User).where(User.id == employee_id))
            employee = emp_result.scalar_one_or_none()
            
            if not employee or employee.manager_id != current_user.id:
                failed.append({"employee_id": str(employee_id), "reason": "Not a direct report."})
                continue

            # Find or create the employee's draft sheet
            draft_result = await db.execute(
                select(GoalSheet).where(
                    GoalSheet.employee_id == employee_id,
                    GoalSheet.financial_year == manager_sheet.financial_year,
                    GoalSheet.status == GoalSheetStatus.draft,
                )
            )
            emp_sheet = draft_result.scalar_one_or_none()

            if emp_sheet is None:
                emp_sheet = GoalSheet(
                    employee_id=employee_id,
                    financial_year=manager_sheet.financial_year,
                    status=GoalSheetStatus.draft,
                )
                db.add(emp_sheet)
                await db.flush()

            # Check if employee has room for more goals (Max 8)
            count_result = await db.execute(
                select(func.count(Goal.id)).where(Goal.sheet_id == emp_sheet.id)
            )
            if count_result.scalar_one() >= 8:
                failed.append({"employee_id": str(employee_id), "reason": "Employee sheet is full."})
                continue

            # Check if this goal was already cascaded to them
            existing_child = await db.execute(
                select(Goal).where(Goal.sheet_id == emp_sheet.id, Goal.parent_goal_id == manager_goal.id)
            )
            if existing_child.scalar_one_or_none():
                failed.append({"employee_id": str(employee_id), "reason": "Goal already cascaded to this employee."})
                continue

            # 4. Create the child goal
            child_goal = Goal(
                sheet_id=emp_sheet.id,
                thrust_area=manager_goal.thrust_area,
                title=manager_goal.title,
                description=f"Cascaded from Manager: {manager_goal.description}",
                uom_type=manager_goal.uom_type,
                target_value=manager_goal.target_value, # Employee might be expected to hit a fraction of the manager's total
                target_date=manager_goal.target_date,
                weightage=Decimal("10.00"),  
                order_index=0, 
                parent_goal_id=manager_goal.id,  # LINK IT TO THE MANAGER'S GOAL!
                is_title_locked=True,
                is_target_locked=False, # Allow employee to adjust their specific portion of the target
            )
            db.add(child_goal)
            cascaded_count += 1

        except Exception as e:
            failed.append({"employee_id": str(employee_id), "reason": str(e)})

    await db.flush()

    return PushGoalResponse(
        master_goal_id=manager_goal.id,
        pushed_to=cascaded_count,
        failed=failed,
        message=f"Goal successfully cascaded to {cascaded_count} team members.",
    )