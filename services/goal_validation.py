from decimal import Decimal
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from models.goal import Goal
from models.goal_sheet import GoalSheet
from models.enums import GoalSheetStatus

async def validate_sheet_is_draft(
    db: AsyncSession,
    sheet: GoalSheet,
    allow_admin: bool = False,
    is_admin: bool = False,
) -> None:
    """Validate that a sheet is in draft status (not locked)."""
    if sheet.locked and not (allow_admin and is_admin):
        raise ValueError("SHEET_LOCKED:Goal sheet is locked and cannot be modified.")
    if sheet.status != GoalSheetStatus.draft and not (allow_admin and is_admin):
        raise ValueError(
            f"SHEET_NOT_DRAFT:Goal sheet is in '{sheet.status.value}' status. "
            "Only draft sheets can be modified."
        )

async def validate_goal_count(
    db: AsyncSession,
    sheet_id,
    max_goals: int = 8,
) -> int:
    """Validate that adding a goal won't exceed the maximum count."""
    result = await db.execute(
        select(func.count(Goal.id)).where(Goal.sheet_id == sheet_id)
    )
    current_count = result.scalar_one()

    if current_count >= max_goals:
        raise ValueError(
            f"MAX_GOALS_EXCEEDED:Sheet already has {current_count} goals. "
            f"Maximum allowed is {max_goals}."
        )
    return current_count


async def validate_submission(
    db: AsyncSession,
    sheet_id,
) -> dict:
    """
    Validate all conditions for submitting a goal sheet.
    Returns validation details. Raises ValueError if any check fails.

    Critical checks (all must pass atomically):
    1. 1 ≤ goal count ≤ 8
    2. Each goal weightage ≥ 10.00
    3. SUM(weightage) == 100.00 (exact Decimal match)
    """
    result = await db.execute(
        select(Goal).where(Goal.sheet_id == sheet_id).order_by(Goal.order_index)
    )
    goals = list(result.scalars().all())

    errors = []

    goal_count = len(goals)
    if goal_count < 1:
        errors.append({
            "code": "NO_GOALS",
            "detail": "Sheet must have at least 1 goal.",
            "context": {"current_count": goal_count, "required_min": 1},
        })
    elif goal_count > 8:
        errors.append({
            "code": "TOO_MANY_GOALS",
            "detail": f"Sheet has {goal_count} goals. Maximum is 8.",
            "context": {"current_count": goal_count, "required_max": 8},
        })

    for goal in goals:
        if goal.weightage < Decimal("10.00"):
            errors.append({
                "code": "WEIGHTAGE_TOO_LOW",
                "detail": f"Goal '{goal.title}' has weightage {goal.weightage}. Minimum is 10.00.",
                "context": {
                    "goal_id": str(goal.id),
                    "goal_title": goal.title,
                    "current_weightage": float(goal.weightage),
                    "required_min": 10.0,
                },
            })

    total_weightage = sum(g.weightage for g in goals) if goals else Decimal("0")
    if total_weightage != Decimal("100.00"):
        errors.append({
            "code": "WEIGHTAGE_SUM_INVALID",
            "detail": f"Total weightage is {total_weightage}. Must be exactly 100.00.",
            "context": {
                "current_sum": float(total_weightage),
                "required": 100.0,
            },
        })

    if errors:
        raise ValueError(errors)

    return {
        "goal_count": goal_count,
        "total_weightage": float(total_weightage),
        "goals": goals,
    }