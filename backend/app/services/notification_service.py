"""Notification service — Expo push and Resend email."""

import logging
import os
from typing import Any

import httpx
import structlog

log = structlog.get_logger("app.services.notification_service")
logger = logging.getLogger(__name__) # Keep for compatibility if needed, but prefer log

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
RESEND_API_URL = "https://api.resend.com/emails"

DEFAULT_PREFS = {
    "new_match": True,
    "interest_received": True,
    "mutual_match": True,
    "expense_added": True,
    "chore_reminder": True,
    "community_reply": True,
    "trust_change": True,
}


class NotificationService:
    def _wants(self, prefs: dict | None, key: str) -> bool:
        if prefs is None:
            return DEFAULT_PREFS.get(key, True)
        return prefs.get(key, DEFAULT_PREFS.get(key, True))

    async def send_push(
        self,
        push_token: str | None,
        title: str,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> None:
        if not push_token:
            return
        if not push_token.startswith("ExponentPushToken["):
            log.debug("push_token_invalid_format", push_token=push_token)
            return

        from app.config import settings
        expo_token = settings.EXPO_ACCESS_TOKEN

        payload = {
            "to": push_token,
            "title": title,
            "body": body,
        }
        if data:
            payload["data"] = data

        headers = {
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json",
        }
        if expo_token:
            headers["Authorization"] = f"Bearer {expo_token}"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(EXPO_PUSH_URL, json=payload, headers=headers)
                if response.status_code != 200:
                    log.warning(
                        "expo_push_failed",
                        status_code=response.status_code,
                        response=response.text,
                        push_token=push_token,
                    )
                else:
                    log.info(
                        "expo_push_sent",
                        push_token=push_token,
                        title=title,
                    )
        except Exception as exc:
            log.error("expo_push_error", error=str(exc), push_token=push_token)

    async def send_email(self, to_email: str, subject: str, html_body: str) -> None:
        api_key = os.getenv("RESEND_API_KEY")
        from_addr = os.getenv("RESEND_FROM_EMAIL", "noreply@urbanhut.app")
        if not api_key:
            log.debug("resend_api_key_not_set", to_email=to_email)
            return

        payload = {
            "from": from_addr,
            "to": [to_email],
            "subject": subject,
            "html": html_body,
        }
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    RESEND_API_URL,
                    json=payload,
                    headers={"Authorization": f"Bearer {api_key}"},
                )
                if resp.status_code not in (200, 201):
                    log.warning("resend_email_failed", status_code=resp.status_code, response=resp.text)
        except Exception as exc:
            log.error("resend_email_error", error=str(exc))

    async def notify_new_interest(
        self,
        host_push_token: str | None,
        host_email: str,
        host_prefs: dict | None,
        applicant_name: str,
        listing_title: str,
    ) -> None:
        if self._wants(host_prefs, "interest_received"):
            await self.send_push(
                host_push_token,
                "New Interest",
                f"{applicant_name} is interested in '{listing_title}'",
                data={"type": "interest_received"},
            )
            await self.send_email(
                host_email,
                f"New interest in {listing_title}",
                f"<p><strong>{applicant_name}</strong> expressed interest in your listing <em>{listing_title}</em>.</p>",
            )

    async def notify_host_decision(
        self,
        applicant_push_token: str | None,
        applicant_email: str,
        applicant_prefs: dict | None,
        decision: str,
        listing_title: str,
    ) -> None:
        if decision == "accepted":
            label = "accepted"
            pref_key = "new_match"
        elif decision == "shortlisted":
            label = "shortlisted"
            pref_key = "new_match"
        else:
            return

        if self._wants(applicant_prefs, pref_key):
            await self.send_push(
                applicant_push_token,
                "Application Update",
                f"Your interest in '{listing_title}' was {label}!",
                data={"type": "host_decision", "decision": decision},
            )

    async def notify_mutual_match(
        self,
        push_token_a: str | None,
        email_a: str,
        prefs_a: dict | None,
        push_token_b: str | None,
        email_b: str,
        prefs_b: dict | None,
        listing_title: str,
    ) -> None:
        msg = f"You have a mutual match for '{listing_title}'! Start a conversation."
        if self._wants(prefs_a, "mutual_match"):
            await self.send_push(push_token_a, "Mutual Match!", msg, data={"type": "mutual_match"})
            await self.send_email(email_a, "You have a mutual match!", f"<p>{msg}</p>")
        if self._wants(prefs_b, "mutual_match"):
            await self.send_push(push_token_b, "Mutual Match!", msg, data={"type": "mutual_match"})
            await self.send_email(email_b, "You have a mutual match!", f"<p>{msg}</p>")

    async def send_chore_reminder(
        self,
        push_token: str | None,
        prefs: dict | None,
        chore_name: str,
        day: str,
    ) -> None:
        if self._wants(prefs, "chore_reminder"):
            await self.send_push(
                push_token,
                "Chore Reminder",
                f"Don't forget: {chore_name} is due {day}!",
                data={"type": "chore_reminder"},
            )

    async def send_bill_due(
        self,
        push_token: str | None,
        prefs: dict | None,
        description: str,
        amount: int,
    ) -> None:
        if self._wants(prefs, "expense_added"):
            await self.send_push(
                push_token,
                "Bill Due",
                f"You owe ${amount / 100:.2f} for {description}",
                data={"type": "expense_added"},
            )
