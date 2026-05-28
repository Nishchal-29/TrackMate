import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base
from models.enums import UomType


class Goal(Base):
    __tablename__ = "goals"
    __table_args__ = (
        CheckConstraint("weightage >= 10.00", name="ck_goals_weightage_min"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    sheet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("goal_sheets.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    thrust_area: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="e.g. Revenue, Customer Satisfaction",
    )
    title: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    uom_type: Mapped[UomType] = mapped_column(
        Enum(UomType, name="uom_type", create_type=False),
        nullable=False,
    )
    target_value: Mapped[Decimal | None] = mapped_column(
        Numeric,
        nullable=True,
        comment="For numeric/percentage UoM types",
    )
    target_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
        comment="For timeline UoM type",
    )
    weightage: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        comment="Must be >= 10.00; sheet total must equal 100.00",
    )
    order_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Display ordering within the goal sheet",
    )

    parent_goal_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("goals.id", ondelete="SET NULL"),
        nullable=True,
        comment="NULL = standalone goal; set for admin-pushed shared KPIs",
    )
    is_title_locked: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="True for child goals pushed by admin — title cannot be edited",
    )
    is_target_locked: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="True for child goals pushed by admin — target cannot be edited",
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

    sheet: Mapped["GoalSheet"] = relationship(
        "GoalSheet",
        back_populates="goals",
    )
    parent_goal: Mapped["Goal | None"] = relationship(
        "Goal",
        remote_side="Goal.id",
        back_populates="child_goals",
    )
    child_goals: Mapped[list["Goal"]] = relationship(
        "Goal",
        back_populates="parent_goal",
    )
    achievements: Mapped[list["Achievement"]] = relationship(
        "Achievement",
        back_populates="goal",
        cascade="all, delete-orphan",
    )
    checkins: Mapped[list["Checkin"]] = relationship(
        "Checkin",
        back_populates="goal",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Goal '{self.title}' weightage={self.weightage}>"
