import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy import text
from dotenv import load_dotenv

from database import async_engine
from middleware.audit import AuditMiddleware
from routers import (
    goals_router,
    push_router,
    achievements_router,
    manager_router,
    admin_router,
    export_router,
)
from routers.auth import router as auth_router

load_dotenv()

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Goal Portal API...")
    try:
        async with async_engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection established successfully.")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise

    yield

    logger.info("Shutting down Goal Portal API...")
    await async_engine.dispose()

app = FastAPI()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(AuditMiddleware)

API_PREFIX = "/api/v1"

app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(goals_router, prefix=API_PREFIX)
app.include_router(push_router, prefix=API_PREFIX)
app.include_router(achievements_router, prefix=API_PREFIX)
app.include_router(manager_router, prefix=API_PREFIX)
app.include_router(admin_router, prefix=API_PREFIX)
app.include_router(export_router, prefix=API_PREFIX)

@app.get("/health", tags=["Health"])
async def health_check():
    try:
        async with async_engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ok", "db": "connected"}
    except Exception:
        return {"status": "degraded", "db": "disconnected"}

@app.get("/", tags=["Health"])
async def root():
    return {
        "name": "Goal Setting & Tracking Portal API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }