import json
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.content_importer import import_from_json_data

router = APIRouter(prefix="/api/content", tags=["content"])


@router.post("/import-json")
async def import_json(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a JSON file of questions to bulk import."""
    if not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="File must be a .json file")

    content = await file.read()
    try:
        questions_data = json.loads(content)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {e}")

    if not isinstance(questions_data, list):
        raise HTTPException(status_code=400, detail="JSON must be an array of question objects")

    inserted = await import_from_json_data(db, questions_data)
    return {"inserted": inserted, "total_submitted": len(questions_data)}
