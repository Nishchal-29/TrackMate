import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class EscalationRule(Base):
    __tablename__ = "escalation_rules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    trigger_event: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="e.g. submission_pending_approval",
    )
    threshold_hours: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Hours before escalation triggers (e.g. 72 for 3 days)",
    )
    escalate_to_role: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="Target role for escalation (e.g. admin)",
    )
    notification_template: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Template text for the escalation notification",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
    )

    # Relationships
    creator: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<EscalationRule {self.trigger_event} after {self.threshold_hours}h>"
