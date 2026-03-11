"""
Reseed helper — wipes all questions and re-imports from seed_questions.json.
Run from the backend/ directory:
    python reseed.py
"""
import asyncio
import os
import sys

# Ensure we can import app modules
sys.path.insert(0, os.path.dirname(__file__))

from database import AsyncSessionLocal, create_tables
from services.content_importer import reseed_from_json
from config import settings


async def main():
    print("==> Creating tables (if not exist)...")
    await create_tables()
    print("==> Reseeding questions from seed_questions.json...")
    async with AsyncSessionLocal() as db:
        inserted = await reseed_from_json(db, settings.seed_data_path)
    print(f"==> Done. {inserted} questions inserted (status=pending_review).")
    print("    Go to /questions/bank to review and approve them.")


if __name__ == "__main__":
    asyncio.run(main())
