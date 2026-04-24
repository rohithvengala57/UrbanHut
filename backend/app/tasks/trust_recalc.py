"""
Periodic trust score recalculation.

Replaces Celery + celery-beat with APScheduler for MVP simplicity.
Run via the lifespan scheduler started in main.py.
For scale (1000+ users), migrate back to Celery distributed task queues.
"""

import time

import structlog
from sqlalchemy import select

from app.database import async_session
from app.models.user import User
from app.services.trust_engine import TrustEngine

log = structlog.get_logger("app.tasks.trust_recalc")


async def recalculate_all_trust_scores() -> None:
    """
    Weekly batch recalculation for all active users.
    Handles score decay and consistency checks.
    Scheduled by APScheduler in main.py lifespan.
    """
    job_start = time.perf_counter()
    log.info("trust_recalc_job_started")

    async with async_session() as db:
        try:
            result = await db.execute(select(User).where(User.status == "active"))
            users = result.scalars().all()
            total_users = len(users)
            log.info("trust_recalc_users_fetched", total_active_users=total_users)
        except Exception as exc:
            log.error(
                "trust_recalc_failed_to_fetch_users",
                error=str(exc),
                exc_info=True,
            )
            return

        engine = TrustEngine(db)
        recalculated = 0
        errors = 0
        error_user_ids: list[str] = []

        for user in users:
            try:
                await engine.calculate(user.id)
                recalculated += 1
            except Exception as exc:
                errors += 1
                error_user_ids.append(str(user.id))
                log.error(
                    "trust_recalc_user_failed",
                    user_id=str(user.id),
                    exc_type=type(exc).__name__,
                    error=str(exc),
                    exc_info=True,
                )

        try:
            await db.commit()
            log.debug("trust_recalc_db_committed")
        except Exception as exc:
            log.error(
                "trust_recalc_commit_failed",
                error=str(exc),
                recalculated_before_commit=recalculated,
                exc_info=True,
            )
            raise

    elapsed_ms = round((time.perf_counter() - job_start) * 1000, 1)
    log.info(
        "trust_recalc_job_complete",
        total_users=total_users,
        recalculated=recalculated,
        errors=errors,
        elapsed_ms=elapsed_ms,
        # Only log first few failing IDs to avoid bloating the log
        failed_user_ids=error_user_ids[:10] if error_user_ids else [],
    )

    if errors > 0:
        log.warning(
            "trust_recalc_partial_failure",
            failed_count=errors,
            total_users=total_users,
            failure_rate_pct=round(errors / total_users * 100, 1) if total_users else 0,
        )
