"""
Background task scheduler using APScheduler.

Replaces Celery + celery-beat for MVP.
For large-scale distributed task queues, migrate to Celery.

Scheduled tasks:
- Weekly trust score batch recalculation (Sunday 3 AM UTC)
"""

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.tasks.trust_recalc import recalculate_all_trust_scores

log = structlog.get_logger("app.tasks.worker")

scheduler = AsyncIOScheduler()

_TRUST_RECALC_JOB = dict(
    day_of_week="sun",
    hour=3,
    minute=0,
)


def start_scheduler() -> None:
    """Call this from the FastAPI lifespan to start scheduled jobs."""
    scheduler.add_job(
        recalculate_all_trust_scores,
        trigger=CronTrigger(**_TRUST_RECALC_JOB),
        id="weekly_trust_recalc",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    scheduler.start()
    log.info(
        "scheduler_started",
        jobs=["weekly_trust_recalc"],
        trust_recalc_schedule=f"Every Sunday at 03:00 UTC",
        misfire_grace_seconds=3600,
    )


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        log.info("scheduler_stopped", jobs_cancelled=["weekly_trust_recalc"])
    else:
        log.debug("scheduler_stop_skipped", reason="not_running")
