from collections.abc import AsyncGenerator

import structlog
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

log = structlog.get_logger("app.database")

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=20,
    max_overflow=10,
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

log.info(
    "database_engine_created",
    pool_size=20,
    max_overflow=10,
    # Mask credentials — only log the host/db portion
    db_host=settings.DATABASE_URL.split("@")[-1] if "@" in settings.DATABASE_URL else "unknown",
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception as exc:
            log.error(
                "db_session_rollback",
                exc_type=type(exc).__name__,
                error=str(exc),
                exc_info=True,
            )
            await session.rollback()
            raise
