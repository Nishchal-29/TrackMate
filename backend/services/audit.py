import logging
import uuid
from datetime import datetime, timezone
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from models.audit_log import AuditLog
logger = logging.getLogger(__name__)

async def write_audit_log(
    db: AsyncSession,
    entity_type: str,
    entity_id: uuid.UUID,
    action: str,
    actor_id: uuid.UUID,
    actor_role: str,
    delta: dict[str, Any] | None = None,
    ip_address: str | None = None,
    reason: str | None = None,
) -> AuditLog:
    """
    Write an audit log entry to the database.

    Args:
        db: Async database session
        entity_type: Type of entity (e.g., "goal", "goal_sheet")
        entity_id: ID of the affected entity
        action: Action performed (e.g., "create", "update", "delete")
        actor_id: ID of the user who performed the action
        actor_role: Role of the user
        delta: JSON dict of changes {"field": {"old": ..., "new": ...}}
        ip_address: Client IP address
        reason: Optional reason (mandatory for post-lock edits)

    Returns:
        The created AuditLog entry
    """
    log_entry = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor_id=actor_id,
        actor_role=actor_role,
        delta=delta,
        ip_address=ip_address,
        reason=reason,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(log_entry)
    await db.flush()

    logger.info(
        f"Audit: {action} on {entity_type}/{entity_id} by {actor_id} ({actor_role})"
    )
    return log_entry


def compute_delta(old_values: dict, new_values: dict) -> dict:
    delta = {}
    for key, new_val in new_values.items():
        old_val = old_values.get(key)
        if old_val != new_val:
            # Convert non-serializable types
            delta[key] = {
                "old": _serialize(old_val),
                "new": _serialize(new_val),
            }
    return delta

def _serialize(value: Any) -> Any:
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if hasattr(value, "value"):  # Enum
        return value.value
    return value