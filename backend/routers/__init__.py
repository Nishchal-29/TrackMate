"""
routers/__init__.py — Router registry.
"""

from routers.goals import router as goals_router, push_router
from routers.achievements import router as achievements_router
from routers.manager import router as manager_router
from routers.admin import router as admin_router
from routers.export import router as export_router

__all__ = [
    "goals_router",
    "push_router",
    "achievements_router",
    "manager_router",
    "admin_router",
    "export_router",
]
