import logging
import os
import httpx

logger = logging.getLogger(__name__)
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")

async def send_webhook_notification(message: str) -> None:
    if not SLACK_WEBHOOK_URL:
        logger.warning(
            "SLACK_WEBHOOK_URL is not configured — skipping notification: %s",
            message[:120],
        )
        return

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                SLACK_WEBHOOK_URL,
                json={"text": message},
            )
            response.raise_for_status()
            logger.info("Webhook notification sent successfully.")
    except httpx.RequestError as exc:
        logger.error(
            "Webhook request failed (network/transport error): %s", exc
        )
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Webhook returned error status %s: %s",
            exc.response.status_code,
            exc.response.text[:200],
        )
    except Exception as exc:
        logger.error("Unexpected error sending webhook notification: %s", exc)