import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    entity_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="e.g. goal, goal_sheet, achievement",
    )
    entity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    action: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="create, update, delete, lock, unlock, escalated",
    )
    actor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
    )
    actor_role: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    delta: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
        comment='{"field": {"old": ..., "new": ...}}',
    )
    ip_address: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True,
        comment="Client IP address",
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
    reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Mandatory for post-lock edits",
    )

    actor: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<AuditLog {self.action} {self.entity_type}/{self.entity_id}>"
