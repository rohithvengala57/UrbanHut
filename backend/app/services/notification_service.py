"""Notification service — Expo push and Resend email."""

import httpx
import structlog

log = structlog.get_logger("app.services.notification_service")

_EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


class NotificationService:
    async def send_push(self, user_id: str, title: str, body: str, data: dict | None = None):
        from app.config import settings

        expo_token = settings.EXPO_ACCESS_TOKEN
        if not expo_token:
            log.warning(
                "expo_push_skipped",
                reason="EXPO_ACCESS_TOKEN_not_configured",
                user_id=user_id,
                title=title,
            )
            return

        payload = {
            "to": user_id,
            "title": title,
            "body": body,
        }
        if data:
            payload["data"] = data

        headers = {
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {expo_token}",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(_EXPO_PUSH_URL, json=payload, headers=headers)
                response.raise_for_status()
                log.info(
                    "expo_push_sent",
                    user_id=user_id,
                    title=title,
                    status_code=response.status_code,
                )
        except httpx.HTTPStatusError as exc:
            log.error(
                "expo_push_http_error",
                user_id=user_id,
                title=title,
                status_code=exc.response.status_code,
                error=str(exc),
            )
        except httpx.RequestError as exc:
            log.error(
                "expo_push_request_error",
                user_id=user_id,
                title=title,
                error=str(exc),
            )

    async def send_email(self, to_email: str, subject: str, html_body: str):
        # TODO: Integrate Resend API
        pass

    async def send_chore_reminder(self, user_id: str, chore_name: str, day: str):
        await self.send_push(
            user_id,
            "Chore Reminder",
            f"Don't forget: {chore_name} is due {day}!",
        )

    async def send_bill_due(self, user_id: str, description: str, amount: int):
        await self.send_push(
            user_id,
            "Bill Due",
            f"You owe ${amount / 100:.2f} for {description}",
        )
