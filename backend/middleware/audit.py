import logging
import uuid
from datetime import datetime, timezone

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from database import AsyncSessionLocal
from models.audit_log import AuditLog

logger = logging.getLogger(__name__)

MUTATING_METHODS = {"POST", "PATCH", "PUT", "DELETE"}
SKIP_PATHS = {"/health", "/docs", "/redoc", "/openapi.json"}

class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        if request.method not in MUTATING_METHODS:
            return await call_next(request)

        path = request.url.path
        if any(path.startswith(skip) for skip in SKIP_PATHS):
            return await call_next(request)

        response = await call_next(request)

        if 200 <= response.status_code < 300:
            try:
                await self._log_mutation(request, response)
            except Exception as e:
                logger.error(f"Audit logging failed: {e}")

        return response

    async def _log_mutation(self, request: Request, response: Response) -> None:
        """Extract context and write audit log."""
        user = getattr(request.state, "user", None)
        if user is None:
            return  # No authenticated user — skip

        path = request.url.path
        entity_type, entity_id = self._extract_entity_from_path(path)

        if entity_type is None:
            return  

        action_map = {
            "POST": "create",
            "PATCH": "update",
            "PUT": "update",
            "DELETE": "delete",
        }
        action = action_map.get(request.method, "unknown")

        if "/submit" in path:
            action = "submit"
        elif "/approve" in path:
            action = "approve"
        elif "/reject" in path:
            action = "reject"
        elif "/unlock" in path:
            action = "unlock"

        ip_address = request.client.host if request.client else None

        try:
            async with AsyncSessionLocal() as session:
                log_entry = AuditLog(
                    entity_type=entity_type,
                    entity_id=entity_id,
                    action=action,
                    actor_id=user.id,
                    actor_role=user.role.value,
                    ip_address=ip_address,
                    timestamp=datetime.now(timezone.utc),
                )
                session.add(log_entry)
                await session.commit()
        except Exception as e:
            logger.error(f"Failed to write audit log: {e}")

    @staticmethod
    def _extract_entity_from_path(path: str) -> tuple[str | None, uuid.UUID | None]:
        parts = path.strip("/").split("/")

        entity_map = {
            "goal-sheets": "goal_sheet",
            "goals": "goal",
            "achievements": "achievement",
            "users": "user",
            "quarterly-cycles": "quarterly_cycle",
            "escalation-rules": "escalation_rule",
            "checkin": "checkin",
        }

        entity_type = None
        entity_id = None

        for i, part in enumerate(parts):
            if part in entity_map:
                entity_type = entity_map[part]
                if i + 1 < len(parts):
                    try:
                        entity_id = uuid.UUID(parts[i + 1])
                    except (ValueError, IndexError):
                        entity_id = uuid.uuid4()

        if entity_type and entity_id is None:
            entity_id = uuid.uuid4()  

        return entity_type, entity_id
