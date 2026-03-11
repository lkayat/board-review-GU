import json
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.content_importer import import_from_json_data
from services.radiopaedia import sync_radiopaedia_cases

router = APIRouter(prefix="/api/content", tags=["content"])


@router.post("/import-json")
async def import_json(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a JSON file of questions to bulk import."""
    if not file.filename or not file.filename.endswith(".json"):
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


@router.post("/sync-radiopaedia")
async def sync_radiopaedia(
    topic: str = Query("genitourinary", description="Radiopaedia system tag to filter cases"),
    limit: int = Query(20, ge=1, le=100, description="Max number of cases to import"),
    db: AsyncSession = Depends(get_db),
):
    """
    Pull GU cases from Radiopaedia API and import as draft questions.
    Professor must review and complete MCQ options before activating.
    Requires RADIOPAEDIA_CLIENT_ID and RADIOPAEDIA_CLIENT_SECRET in .env
    """
    result = await sync_radiopaedia_cases(db, topic_filter=topic, limit=limit)
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    return result
