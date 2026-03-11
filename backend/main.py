from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import logging

from config import settings
from database import create_tables, AsyncSessionLocal
from services.content_importer import seed_from_json
from routers import questions, content

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Creating database tables...")
    await create_tables()
    logger.info("Seeding question bank...")
    async with AsyncSessionLocal() as db:
        inserted = await seed_from_json(db, settings.seed_data_path)
        if inserted:
            logger.info(f"Seeded {inserted} questions.")
    yield
    # Shutdown (nothing to clean up for now)


app = FastAPI(
    title="GU Board Review Platform",
    description="Professor-led genitourinary radiology board review for residency programs",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow Vercel frontend and local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins + ["*"] if os.getenv("ENV") != "production" else settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(questions.router)
app.include_router(content.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


# Serve React build as static files (production only)
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")
