import logging
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from middleware.auth import get_current_user
from models.achievement import Achievement
from models.goal import Goal
from models.goal_sheet import GoalSheet
from models.quarterly_cycle import QuarterlyCycle
from models.enums import GoalSheetStatus
from schemas.achievement import AchievementCreate, AchievementResponse
from schemas.user import CurrentUser
from services.scoring import compute_score
from services.audit import write_audit_log

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/goals", tags=["Achievements"])


@router.post(
    "/{goal_id}/achievements",
    response_model=AchievementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit quarterly achievement",
)
async def submit_achievement(
    goal_id: uuid.UUID,
    body: AchievementCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Submit or update a quarterly achievement for a goal.
    
    Enforces:
    1. Time-gate: quarter tracking must be open
    2. Sheet must be approved (locked)
    3. Upserts: one record per goal per quarter per year
    4. Computes score automatically
    """
    result = await db.execute(
        select(Goal)
        .where(Goal.id == goal_id)
        .options(selectinload(Goal.sheet))
    )
    goal = result.scalar_one_or_none()
    if goal is None:
        raise HTTPException(status_code=404, detail="Goal not found.")

    sheet = goal.sheet
    if sheet is None:
        raise HTTPException(status_code=404, detail="Goal sheet not found.")

    if sheet.status != GoalSheetStatus.approved or not sheet.locked:
        raise HTTPException(
            status_code=422,
            detail={
                "detail": "Achievements can only be submitted for approved (locked) goal sheets.",
                "code": "SHEET_NOT_APPROVED",
            },
        )

    now = datetime.now(timezone.utc)
    cycle_result = await db.execute(
        select(QuarterlyCycle).where(
            QuarterlyCycle.quarter == body.quarter,
            QuarterlyCycle.financial_year == body.financial_year,
            QuarterlyCycle.is_active == True,
        )
    )
    cycle = cycle_result.scalar_one_or_none()

    if cycle is None:
        raise HTTPException(
            status_code=403,
            detail={
                "detail": f"No active tracking cycle found for {body.quarter.value} {body.financial_year}.",
                "code": "NO_ACTIVE_CYCLE",
            },
        )

    if now < cycle.tracking_opens_at:
        raise HTTPException(
            status_code=403,
            detail={
                "detail": f"Achievement tracking for {body.quarter.value} is not open yet. Opens on {cycle.tracking_opens_at.isoformat()}.",
                "code": "TRACKING_NOT_OPEN",
            },
        )

    if now > cycle.tracking_closes_at:
        raise HTTPException(
            status_code=403,
            detail={
                "detail": f"Achievement tracking for {body.quarter.value} has closed. Closed on {cycle.tracking_closes_at.isoformat()}.",
                "code": "TRACKING_CLOSED",
            },
        )

    score = compute_score(
        uom_type=goal.uom_type.value,
        target_value=goal.target_value,
        actual_value=body.actual_value,
        target_date=goal.target_date,
        actual_date=body.actual_date,
    )

    existing_result = await db.execute(
        select(Achievement).where(
            Achievement.goal_id == goal_id,
            Achievement.quarter == body.quarter,
            Achievement.financial_year == body.financial_year,
        )
    )
    existing = existing_result.scalar_one_or_none()

    if existing:
        existing.actual_value = body.actual_value
        existing.actual_date = body.actual_date
        existing.score = score
        existing.notes = body.notes
        existing.submitted_by = current_user.id
        existing.submitted_at = now
        await db.flush()

        await write_audit_log(
            db, "achievement", existing.id, "update",
            current_user.id, current_user.role.value,
            delta={
                "actual_value": {"old": str(existing.actual_value), "new": str(body.actual_value)},
                "score": {"old": str(existing.score), "new": str(score)},
            },
        )
        return existing
    else:
        # Create new
        achievement = Achievement(
            goal_id=goal_id,
            quarter=body.quarter,
            financial_year=body.financial_year,
            actual_value=body.actual_value,
            actual_date=body.actual_date,
            score=score,
            submitted_by=current_user.id,
            submitted_at=now,
            notes=body.notes,
        )
        db.add(achievement)
        await db.flush()

        await write_audit_log(
            db, "achievement", achievement.id, "create",
            current_user.id, current_user.role.value,
        )
        return achievement


@router.get(
    "/{goal_id}/achievements",
    response_model=list[AchievementResponse],
    summary="Get all achievements for a goal",
)
async def get_achievements(
    goal_id: uuid.UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get all quarterly achievements for a specific goal."""
    goal_result = await db.execute(select(Goal).where(Goal.id == goal_id))
    goal = goal_result.scalar_one_or_none()
    if goal is None:
        raise HTTPException(status_code=404, detail="Goal not found.")

    result = await db.execute(
        select(Achievement)
        .where(Achievement.goal_id == goal_id)
        .order_by(Achievement.financial_year, Achievement.quarter)
    )
    return result.scalars().all()
