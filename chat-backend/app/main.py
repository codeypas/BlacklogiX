from __future__ import annotations

import logging

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.auth_routes import router as auth_router
from app.api.chat_routes import router as chat_router
from app.api.event_routes import router as event_router
from app.api.integrity_routes import router as integrity_router
from app.api.platform_routes import router as platform_router
from app.config import settings
from app.db.database import create_db_tables

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("blacklogix-chat-backend")

app = FastAPI(
    title="BlackLogix Chat Backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event() -> None:
    # V1 uses create_all for fast setup. Alembic can be introduced later.
    await create_db_tables()
    logger.info("Database tables are ready")


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled application error", exc_info=exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "blacklogix-chat-backend"}


app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(event_router)
app.include_router(integrity_router)
app.include_router(platform_router)
