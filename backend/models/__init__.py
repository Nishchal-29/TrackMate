"""
models/__init__.py — Central model registry.

Imports all ORM models so that:
1. Alembic can auto-detect them for migration generation.
2. SQLAlchemy relationship back-references resolve correctly.
3. Other modules can do `from models import User, Goal, ...`
"""

from models.enums import GoalSheetStatus, Quarter, UomType, UserRole
from models.user import User
from models.goal_sheet import GoalSheet
from models.goal import Goal
from models.achievement import Achievement
from models.checkin import Checkin
from models.audit_log import AuditLog
from models.quarterly_cycle import QuarterlyCycle
from models.escalation_rule import EscalationRule

__all__ = [
    # Enums
    "UserRole",
    "GoalSheetStatus",
    "UomType",
    "Quarter",
    # Models
    "User",
    "GoalSheet",
    "Goal",
    "Achievement",
    "Checkin",
    "AuditLog",
    "QuarterlyCycle",
    "EscalationRule",
]
