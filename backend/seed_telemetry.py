import asyncio
import random
import uuid
from datetime import datetime, timedelta, timezone

from app.database import async_session
from app.models.analytics import TelemetryEvent
from app.models.user import User
from sqlalchemy import select

async def seed_telemetry():
    async with async_session() as db:
        # Get some real users to associate with events
        result = await db.execute(select(User).limit(10))
        users = result.scalars().all()
        
        if not users:
            print("No users found. Run seed.py first.")
            return

        now = datetime.now(timezone.utc)
        events = []

        channels = [
            {"source": "instagram", "medium": "paid", "campaign": "urbhut_launch_w1_jc_trust"},
            {"source": "tiktok", "medium": "paid", "campaign": "urbhut_launch_w1_jc_speed"},
            {"source": "reddit", "medium": "community", "campaign": "urbhut_launch_w1_manhattan_cost"},
            {"source": "direct", "medium": "none", "campaign": "(not_set)"}
        ]

        cities = ["Jersey City", "New York", "Hoboken"]

        # Today's simulated traffic (April 27, 2026)
        # We want to hit some targets: 400 visitors, 70 signups for the week.
        # Let's do 100 visitors for today.
        
        for i in range(100):
            channel = random.choice(channels)
            city = random.choice(cities)
            ts = now - timedelta(minutes=random.randint(0, 480)) # last 8 hours
            
            # Visitor
            events.append(TelemetryEvent(
                event_name="landing_page_viewed",
                source="mobile",
                session_id=f"sess_seed_{i}",
                occurred_at=ts,
                event_date=ts.date(),
                utm_source=channel["source"],
                utm_medium=channel["medium"],
                utm_campaign=channel["campaign"],
                city=city,
                properties={"city": city}
            ))

            # 20% conversion to signup
            if random.random() < 0.2:
                user = random.choice(users)
                signup_ts = ts + timedelta(minutes=random.randint(1, 10))
                events.append(TelemetryEvent(
                    user_id=user.id,
                    event_name="signup_completed",
                    source="mobile",
                    session_id=f"sess_seed_{i}",
                    occurred_at=signup_ts,
                    event_date=signup_ts.date(),
                    utm_source=channel["source"],
                    utm_medium=channel["medium"],
                    utm_campaign=channel["campaign"],
                    city=city,
                    properties={"method": "email_password"}
                ))

                # 50% activation
                if random.random() < 0.5:
                    act_ts = signup_ts + timedelta(minutes=random.randint(5, 60))
                    events.append(TelemetryEvent(
                        user_id=user.id,
                        event_name="chat_message_sent",
                        source="mobile",
                        session_id=f"sess_seed_{i}",
                        occurred_at=act_ts,
                        event_date=act_ts.date(),
                        utm_source=channel["source"],
                        utm_medium=channel["medium"],
                        utm_campaign=channel["campaign"],
                        city=city,
                        properties={"room_id": str(uuid.uuid4())}
                    ))

        db.add_all(events)
        await db.commit()
        print(f"Seeded {len(events)} telemetry events for today.")

if __name__ == "__main__":
    asyncio.run(seed_telemetry())
