import enum

class UserRole(str, enum.Enum):
    """Roles for RBAC: employee, manager, admin."""
    employee = "employee"
    manager = "manager"
    admin = "admin"


class GoalSheetStatus(str, enum.Enum):
    """Lifecycle states of a goal sheet."""
    draft = "draft"
    pending_approval = "pending_approval"
    approved = "approved"
    rejected = "rejected"


class UomType(str, enum.Enum):
    """Unit of Measurement types for goal targets."""
    numeric = "numeric"
    percentage = "percentage"
    timeline = "timeline"
    zero_based = "zero_based"


class Quarter(str, enum.Enum):
    """Financial year quarters."""
    Q1 = "Q1"
    Q2 = "Q2"
    Q3 = "Q3"
    Q4 = "Q4"
