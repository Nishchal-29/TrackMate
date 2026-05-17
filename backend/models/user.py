import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base
from models.enums import UserRole


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    azure_oid: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        comment="Azure AD Object ID — used for SSO mapping",
    )
    email: Mapped[str] = mapped_column(
        String(320),
        unique=True,
        nullable=False,
        index=True,
    )
    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", create_type=False),
        nullable=False,
        default=UserRole.employee,
    )
    manager_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="Self-referential FK for org hierarchy",
    )
    department: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    password_hash: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="Bcrypt hash for local auth fallback (when no Entra ID)",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
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

    manager: Mapped["User | None"] = relationship(
        "User",
        remote_side="User.id",
        back_populates="direct_reports",
    )
    direct_reports: Mapped[list["User"]] = relationship(
        "User",
        back_populates="manager",
    )
    goal_sheets: Mapped[list["GoalSheet"]] = relationship(
        "GoalSheet",
        foreign_keys="GoalSheet.employee_id",
        back_populates="employee",
    )

    def __repr__(self) -> str:
        return f"<User {self.email} role={self.role.value}>"
