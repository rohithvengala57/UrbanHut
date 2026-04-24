"""Notification service — placeholder for push + email notifications."""


class NotificationService:
    async def send_push(self, user_id: str, title: str, body: str, data: dict | None = None):
        # TODO: Integrate Expo push notifications
        pass

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
