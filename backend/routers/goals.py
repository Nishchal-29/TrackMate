import logging
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from middleware.auth import get_current_user, require_manager, require_admin
from models.goal import Goal
from models.goal_sheet import GoalSheet
from models.achievement import Achievement
from models.user import User
from models.enums import GoalSheetStatus, UserRole
from schemas.goal import GoalCreate, GoalUpdate, GoalResponse, PushGoalRequest, PushGoalResponse
from schemas.goal_sheet import (
    GoalSheetCreate, GoalSheetResponse, GoalSheetSubmitResponse,
    GoalSheetApprovalRequest, GoalSheetUnlockRequest,
)
from schemas.user import CurrentUser
from services.goal_validation import (
    validate_sheet_is_draft, validate_goal_count, validate_submission,
)
from services.audit import write_audit_log, compute_delta

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/goal-sheets", tags=["Goal Sheets"])

@router.post(
    "/",
    response_model=GoalSheetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new draft goal sheet",
)
async def create_goal_sheet(
    body: GoalSheetCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new draft goal sheet for the current user's financial year."""
    result = await db.execute(
        select(GoalSheet).where(
            GoalSheet.employee_id == current_user.id,
            GoalSheet.financial_year == body.financial_year,
            GoalSheet.status != GoalSheetStatus.rejected,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "detail": f"An active goal sheet already exists for {body.financial_year}.",
                "code": "SHEET_ALREADY_EXISTS",
                "context": {"existing_sheet_id": str(existing.id), "status": existing.status.value},
            },
        )

    sheet = GoalSheet(
        employee_id=current_user.id,
        financial_year=body.financial_year,
        status=GoalSheetStatus.draft,
    )
    db.add(sheet)
    await db.flush()

    await write_audit_log(
        db, "goal_sheet", sheet.id, "create",
        current_user.id, current_user.role.value,
    )

    result = await db.execute(
        select(GoalSheet)
        .where(GoalSheet.id == sheet.id)
        .options(selectinload(GoalSheet.goals).selectinload(Goal.achievements))
    )
    return result.scalar_one()


@router.get(
    "/me",
    response_model=list[GoalSheetResponse],
    summary="Get current user's goal sheets",
)
async def get_my_sheets(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    financial_year: str | None = None,
):
    query = (
        select(GoalSheet)
        .where(GoalSheet.employee_id == current_user.id)
        .options(selectinload(GoalSheet.goals).selectinload(Goal.achievements))
        .order_by(GoalSheet.created_at.desc())
    )
    if financial_year:
        query = query.where(GoalSheet.financial_year == financial_year)

    result = await db.execute(query)
    sheets = result.scalars().unique().all()
    return sheets

@router.get(
    "/{sheet_id}",
    response_model=GoalSheetResponse,
    summary="Get a specific goal sheet",
)
async def get_sheet(
    sheet_id: uuid.UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(GoalSheet)
        .where(GoalSheet.id == sheet_id)
        .options(selectinload(GoalSheet.goals).selectinload(Goal.achievements))
    )
    sheet = result.scalar_one_or_none()

    if sheet is None:
        raise HTTPException(status_code=404, detail="Goal sheet not found.")

    if current_user.role == UserRole.employee and sheet.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only view your own goal sheets.")

    if current_user.role == UserRole.manager:
        emp_result = await db.execute(
            select(User).where(User.id == sheet.employee_id)
        )
        employee = emp_result.scalar_one_or_none()
        if employee and employee.manager_id != current_user.id and sheet.employee_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only view your team's goal sheets.")

    return sheet

@router.post(
    "/{sheet_id}/goals",
    response_model=GoalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a goal to a sheet",
)
async def add_goal(
    sheet_id: uuid.UUID,
    body: GoalCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(GoalSheet).where(GoalSheet.id == sheet_id)
    )
    sheet = result.scalar_one_or_none()
    if sheet is None:
        raise HTTPException(status_code=404, detail="Goal sheet not found.")

    if sheet.employee_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="You can only add goals to your own sheet.")

    try:
        await validate_sheet_is_draft(db, sheet)
    except ValueError as e:
        code, msg = str(e).split(":", 1)
        raise HTTPException(status_code=422, detail={"detail": msg, "code": code})

    try:
        current_count = await validate_goal_count(db, sheet_id)
    except ValueError as e:
        code, msg = str(e).split(":", 1)
        raise HTTPException(status_code=422, detail={"detail": msg, "code": code})

    goal = Goal(
        sheet_id=sheet_id,
        thrust_area=body.thrust_area,
        title=body.title,
        description=body.description,
        uom_type=body.uom_type,
        target_value=body.target_value,
        target_date=body.target_date,
        weightage=body.weightage,
        order_index=current_count,
    )
    db.add(goal)
    await db.flush()

    await write_audit_log(
        db, "goal", goal.id, "create",
        current_user.id, current_user.role.value,
    )

    new_goal_result = await db.execute(
        select(Goal)
        .where(Goal.id == goal.id)
        .options(selectinload(Goal.achievements))
    )
    return new_goal_result.scalar_one()

@router.patch("/{sheet_id}/goals/{goal_id}", response_model=GoalResponse)
async def update_goal(
    sheet_id: uuid.UUID,
    goal_id: uuid.UUID,
    body: GoalUpdate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    sheet_result = await db.execute(
        select(GoalSheet).where(GoalSheet.id == sheet_id)
    )
    sheet = sheet_result.scalar_one_or_none()
    if sheet is None:
        raise HTTPException(status_code=404, detail="Goal sheet not found.")

    goal_result = await db.execute(
        select(Goal)
        .where(Goal.id == goal_id, Goal.sheet_id == sheet_id)
        .options(selectinload(Goal.achievements))
    )
    goal = goal_result.scalar_one_or_none()  
    if goal is None:
        raise HTTPException(status_code=404, detail="Goal not found in this sheet.")

    if sheet.locked:
        if current_user.role != UserRole.admin:
            raise HTTPException(
                status_code=403,
                detail={"detail": "Sheet is locked. Only admins can edit locked sheets.", "code": "SHEET_LOCKED"},
            )
        if not body.reason:
            raise HTTPException(
                status_code=422,
                detail={"detail": "A reason is required for editing locked sheets.", "code": "REASON_REQUIRED"},
            )
            
    update_data = body.model_dump(exclude_unset=True)
    update_data.pop("reason", None)  

    if goal.is_title_locked and "title" in update_data:
        raise HTTPException(
            status_code=422,
            detail={"detail": "Title is locked for this shared KPI.", "code": "TITLE_LOCKED"},
        )
    if goal.is_target_locked and ("target_value" in update_data or "target_date" in update_data):
        raise HTTPException(
            status_code=422,
            detail={"detail": "Target is locked for this shared KPI.", "code": "TARGET_LOCKED"},
        )

    old_values = {k: getattr(goal, k) for k in update_data}
    for key, value in update_data.items():
        setattr(goal, key, value)
    await db.flush()

    delta = compute_delta(old_values, update_data)
    if delta:
        await write_audit_log(
            db, "goal", goal.id, "update",
            current_user.id, current_user.role.value,
            delta=delta, reason=body.reason,
        )

    return goal

@router.delete(
    "/{sheet_id}/goals/{goal_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a goal from a sheet",
)
async def delete_goal(
    sheet_id: uuid.UUID,
    goal_id: uuid.UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(GoalSheet).where(GoalSheet.id == sheet_id)
    )
    sheet = result.scalar_one_or_none()
    if sheet is None:
        raise HTTPException(status_code=404, detail="Goal sheet not found.")

    try:
        await validate_sheet_is_draft(db, sheet)
    except ValueError as e:
        code, msg = str(e).split(":", 1)
        raise HTTPException(status_code=422, detail={"detail": msg, "code": code})

    result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.sheet_id == sheet_id)
    )
    goal = result.scalar_one_or_none()
    if goal is None:
        raise HTTPException(status_code=404, detail="Goal not found in this sheet.")

    if goal.parent_goal_id is not None:
        raise HTTPException(
            status_code=422,
            detail={"detail": "Cannot delete shared/child goals.", "code": "CANNOT_DELETE_SHARED_GOAL"},
        )

    await write_audit_log(
        db, "goal", goal.id, "delete",
        current_user.id, current_user.role.value,
    )

    await db.delete(goal)
    await db.flush()

@router.post(
    "/{sheet_id}/submit",
    response_model=GoalSheetSubmitResponse,
    summary="Submit goal sheet for approval",
)
async def submit_sheet(
    sheet_id: uuid.UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(GoalSheet)
        .where(GoalSheet.id == sheet_id)
        .options(selectinload(GoalSheet.goals).selectinload(Goal.achievements))
    )
    sheet = result.scalar_one_or_none()
    if sheet is None:
        raise HTTPException(status_code=404, detail="Goal sheet not found.")

    if sheet.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only submit your own goal sheets.")

    if sheet.status != GoalSheetStatus.draft:
        raise HTTPException(
            status_code=422,
            detail={
                "detail": f"Sheet is in '{sheet.status.value}' status. Only draft sheets can be submitted.",
                "code": "SHEET_NOT_DRAFT",
            },
        )

    try:
        await validate_submission(db, sheet_id)
    except ValueError as e:
        errors = e.args[0] if isinstance(e.args[0], list) else [{"code": "VALIDATION_ERROR", "detail": str(e)}]
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"detail": "Submission validation failed.", "code": "VALIDATION_FAILED", "errors": errors},
        )

    now = datetime.now(timezone.utc)
    sheet.status = GoalSheetStatus.pending_approval
    sheet.submitted_at = now
    sheet.review_notes = None
    await db.flush()

    await write_audit_log(
        db, "goal_sheet", sheet.id, "submit",
        current_user.id, current_user.role.value,
        delta={"status": {"old": "draft", "new": "pending_approval"}},
    )

    return GoalSheetSubmitResponse(
        id=sheet.id,
        status=sheet.status,
        submitted_at=now,
        message="Goal sheet submitted for approval.",
    )


@router.post(
    "/{sheet_id}/approve",
    response_model=GoalSheetResponse,
    summary="Approve a goal sheet (manager/admin)",
)
async def approve_sheet(
    sheet_id: uuid.UUID,
    current_user: Annotated[CurrentUser, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(GoalSheet)
        .where(GoalSheet.id == sheet_id)
        .options(selectinload(GoalSheet.goals).selectinload(Goal.achievements))
    )
    sheet = result.scalar_one_or_none()
    if sheet is None:
        raise HTTPException(status_code=404, detail="Goal sheet not found.")

    if sheet.status != GoalSheetStatus.pending_approval:
        raise HTTPException(
            status_code=422,
            detail={"detail": "Only pending sheets can be approved.", "code": "NOT_PENDING"},
        )

    if current_user.role != UserRole.admin:
        emp_result = await db.execute(
            select(User).where(User.id == sheet.employee_id)
        )
        employee = emp_result.scalar_one_or_none()
        if employee and employee.manager_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You can only approve sheets of your direct reports.",
            )

    now = datetime.now(timezone.utc)
    sheet.status = GoalSheetStatus.approved
    sheet.locked = True
    sheet.approved_at = now
    sheet.approved_by = current_user.id
    await db.flush()

    await write_audit_log(
        db, "goal_sheet", sheet.id, "approve",
        current_user.id, current_user.role.value,
        delta={"status": {"old": "pending_approval", "new": "approved"}, "locked": {"old": False, "new": True}},
    )

    return sheet

@router.post(
    "/{sheet_id}/reject",
    response_model=GoalSheetResponse,
    summary="Reject a goal sheet (manager/admin)",
)
async def reject_sheet(
    sheet_id: uuid.UUID,
    body: GoalSheetApprovalRequest,
    current_user: Annotated[CurrentUser, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(GoalSheet)
        .where(GoalSheet.id == sheet_id)
        .options(selectinload(GoalSheet.goals).selectinload(Goal.achievements))
    )
    sheet = result.scalar_one_or_none()
    if sheet is None:
        raise HTTPException(status_code=404, detail="Goal sheet not found.")

    if sheet.status != GoalSheetStatus.pending_approval:
        raise HTTPException(
            status_code=422,
            detail={"detail": "Only pending sheets can be rejected.", "code": "NOT_PENDING"},
        )

    if current_user.role != UserRole.admin:
        emp_result = await db.execute(
            select(User).where(User.id == sheet.employee_id)
        )
        employee = emp_result.scalar_one_or_none()
        if employee and employee.manager_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only reject sheets of your direct reports.")

    sheet.status = GoalSheetStatus.rejected
    sheet.locked = False
    sheet.review_notes = body.reason
    await db.flush()

    await write_audit_log(
        db, "goal_sheet", sheet.id, "reject",
        current_user.id, current_user.role.value,
        delta={"status": {"old": "pending_approval", "new": "rejected"}},
        reason=body.reason,
    )

    return sheet

@router.post(
    "/{sheet_id}/unlock",
    response_model=GoalSheetResponse,
    summary="Unlock a goal sheet (admin only)",
)
async def unlock_sheet(
    sheet_id: uuid.UUID,
    body: GoalSheetUnlockRequest,
    current_user: Annotated[CurrentUser, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(GoalSheet)
        .where(GoalSheet.id == sheet_id)
        .options(selectinload(GoalSheet.goals).selectinload(Goal.achievements))
    )
    sheet = result.scalar_one_or_none()
    if sheet is None:
        raise HTTPException(status_code=404, detail="Goal sheet not found.")

    if sheet.status not in (GoalSheetStatus.approved, GoalSheetStatus.rejected):
        raise HTTPException(
            status_code=422,
            detail={"detail": "Only approved or rejected sheets can be unlocked back to draft.", "code": "CANNOT_UNLOCK"},
        )

    old_status = sheet.status.value if hasattr(sheet.status, 'value') else str(sheet.status)
    sheet.locked = False
    sheet.status = GoalSheetStatus.draft
    sheet.approved_at = None
    sheet.approved_by = None
    sheet.submitted_at = None
    sheet.review_notes = body.reason
    await db.flush()

    await write_audit_log(
        db, "goal_sheet", sheet.id, "unlock",
        current_user.id, current_user.role.value,
        delta={
            "locked": {"old": True, "new": False},
            "status": {"old": old_status, "new": "draft"}
        },
        reason=body.reason,
    )

    return sheet

push_router = APIRouter(prefix="/admin", tags=["Admin — Goals"])

@push_router.post(
    "/push-goal",
    response_model=PushGoalResponse,
    summary="Push a shared KPI to employees (admin/manager)",
)
async def push_goal(
    body: PushGoalRequest,
    current_user: Annotated[CurrentUser, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    master_goal = Goal(
        sheet_id=None,  
        thrust_area=body.thrust_area,
        title=body.title,
        description=body.description,
        uom_type=body.uom_type,
        target_value=body.target_value,
        target_date=body.target_date,
        weightage=Decimal("10.00"),  
        order_index=0,
    )

    pushed_count = 0
    failed = []

    for employee_id in body.employee_ids:
        try:
            result = await db.execute(
                select(GoalSheet).where(
                    GoalSheet.employee_id == employee_id,
                    GoalSheet.financial_year == body.financial_year,
                    GoalSheet.status == GoalSheetStatus.draft,
                )
            )
            sheet = result.scalar_one_or_none()

            if sheet is None:
                sheet = GoalSheet(
                    employee_id=employee_id,
                    financial_year=body.financial_year,
                    status=GoalSheetStatus.draft,
                )
                db.add(sheet)
                await db.flush()

            count_result = await db.execute(
                select(func.count(Goal.id)).where(Goal.sheet_id == sheet.id)
            )
            current_count = count_result.scalar_one()

            if current_count >= 8:
                failed.append({
                    "employee_id": str(employee_id),
                    "reason": "Employee already has 8 goals",
                })
                continue

            child_goal = Goal(
                sheet_id=sheet.id,
                thrust_area=body.thrust_area,
                title=body.title,
                description=body.description,
                uom_type=body.uom_type,
                target_value=body.target_value,
                target_date=body.target_date,
                weightage=Decimal("10.00"),  # Employee must assign proper weightage
                order_index=current_count,
                parent_goal_id=master_goal.id if master_goal.id else None,
                is_title_locked=True,
                is_target_locked=True,
            )
            db.add(child_goal)
            pushed_count += 1

        except Exception as e:
            logger.error(f"Failed to push goal to employee {employee_id}: {e}")
            failed.append({
                "employee_id": str(employee_id),
                "reason": str(e),
            })

    await db.flush()

    return PushGoalResponse(
        master_goal_id=master_goal.id or uuid.uuid4(),
        pushed_to=pushed_count,
        failed=failed,
        message=f"Shared KPI pushed to {pushed_count} employees.",
    )