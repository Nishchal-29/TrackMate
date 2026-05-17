import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base
from models.enums import Quarter


class Achievement(Base):
    __tablename__ = "achievements"
    __table_args__ = (
        UniqueConstraint(
            "goal_id", "quarter", "financial_year",
            name="uq_achievements_goal_quarter_year",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    goal_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("goals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    quarter: Mapped[Quarter] = mapped_column(
        Enum(Quarter, name="quarter", create_type=False),
        nullable=False,
    )
    financial_year: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    actual_value: Mapped[Decimal | None] = mapped_column(
        Numeric,
        nullable=True,
        comment="Actual numeric/percentage value achieved",
    )
    actual_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
        comment="For timeline UoM — actual completion date",
    )
    score: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2),
        nullable=True,
        comment="Computed by backend scoring engine (0-100)",
    )
    submitted_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    goal: Mapped["Goal"] = relationship(
        "Goal",
        back_populates="achievements",
    )
    submitter: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<Achievement goal={self.goal_id} {self.quarter.value} score={self.score}>"