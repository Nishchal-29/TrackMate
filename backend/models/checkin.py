import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base
from models.enums import Quarter


class Checkin(Base):
    __tablename__ = "checkins"
    __table_args__ = (
        CheckConstraint(
            "rating >= 1 AND rating <= 5",
            name="ck_checkins_rating_range",
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
    comment: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    rating: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="Manager rating 1-5",
    )
    authored_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    goal: Mapped["Goal"] = relationship(
        "Goal",
        back_populates="checkins",
    )
    author: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<Checkin goal={self.goal_id} {self.quarter.value} rating={self.rating}>"
