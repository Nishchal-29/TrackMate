import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base
from models.enums import Quarter


class QuarterlyCycle(Base):
    __tablename__ = "quarterly_cycles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    financial_year: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    quarter: Mapped[Quarter] = mapped_column(
        Enum(Quarter, name="quarter", create_type=False),
        nullable=False,
    )
    tracking_opens_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    tracking_closes_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
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

    creator: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<QuarterlyCycle {self.financial_year} {self.quarter.value} active={self.is_active}>"
