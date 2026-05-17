import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base
from models.enums import GoalSheetStatus


class GoalSheet(Base):
    __tablename__ = "goal_sheets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    financial_year: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="e.g. FY2025-26",
    )
    status: Mapped[GoalSheetStatus] = mapped_column(
        Enum(GoalSheetStatus, name="goal_sheet_status", create_type=False),
        nullable=False,
        default=GoalSheetStatus.draft,
    )
    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    locked: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="True after manager approval — prevents edits",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    employee: Mapped["User"] = relationship(
        "User",
        foreign_keys=[employee_id],
        back_populates="goal_sheets",
    )
    approver: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[approved_by],
    )
    goals: Mapped[list["Goal"]] = relationship(
        "Goal",
        back_populates="sheet",
        cascade="all, delete-orphan",
        order_by="Goal.order_index",
    )

    def __repr__(self) -> str:
        return f"<GoalSheet {self.financial_year} status={self.status.value}>"
