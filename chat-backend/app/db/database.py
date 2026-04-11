from __future__ import annotations

from typing import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(settings.database_url, echo=False, future=True)
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def create_db_tables() -> None:
    # Import models here so SQLAlchemy knows about every table before create_all runs.
    from app.db import models  # noqa: F401

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        # Local development currently relies on create_all. These guards keep older
        # databases compatible as Step 3 adds integrity fields to existing tables.
        await connection.execute(
            text(
                """
                ALTER TABLE ai_events
                ADD COLUMN IF NOT EXISTS hash_algorithm VARCHAR(32) NOT NULL DEFAULT 'sha256',
                ADD COLUMN IF NOT EXISTS raw_hash VARCHAR(64),
                ADD COLUMN IF NOT EXISTS previous_hash VARCHAR(64),
                ADD COLUMN IF NOT EXISTS chain_hash VARCHAR(64)
                """
            )
        )
        await connection.execute(
            text(
                """
                ALTER TABLE system_events
                ADD COLUMN IF NOT EXISTS hash_algorithm VARCHAR(32) NOT NULL DEFAULT 'sha256',
                ADD COLUMN IF NOT EXISTS raw_hash VARCHAR(64),
                ADD COLUMN IF NOT EXISTS previous_hash VARCHAR(64),
                ADD COLUMN IF NOT EXISTS chain_hash VARCHAR(64)
                """
            )
        )
        await connection.execute(
            text(
                """
                UPDATE ai_events
                SET hash_algorithm = COALESCE(hash_algorithm, 'sha256')
                WHERE hash_algorithm IS NULL
                """
            )
        )
        await connection.execute(
            text(
                """
                UPDATE system_events
                SET hash_algorithm = COALESCE(hash_algorithm, 'sha256')
                WHERE hash_algorithm IS NULL
                """
            )
        )
        await connection.execute(
            text(
                """
                ALTER TABLE ingestion_sources
                ADD COLUMN IF NOT EXISTS api_key_prefix VARCHAR(32),
                ADD COLUMN IF NOT EXISTS api_key_hash VARCHAR(64),
                ADD COLUMN IF NOT EXISTS last_key_rotated_at TIMESTAMPTZ
                """
            )
        )
        await connection.execute(
            text(
                """
                ALTER TABLE chat_sessions
                ADD COLUMN IF NOT EXISTS project_id UUID,
                ADD COLUMN IF NOT EXISTS context_json JSONB NOT NULL DEFAULT '{}'::jsonb
                """
            )
        )
