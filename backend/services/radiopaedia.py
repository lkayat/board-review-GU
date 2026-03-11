"""
Radiopaedia API integration.

Fetches GU imaging cases from Radiopaedia and imports them as draft questions.
Professors must review and edit MCQ options + correct answer before activating.

API docs: https://api-docs.radiopaedia.org/
Auth: OAuth2 client credentials flow.
"""
import json
import logging
import time
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from config import settings
from models.question import Question

logger = logging.getLogger(__name__)

RADIOPAEDIA_TOKEN_URL = "https://radiopaedia.org/oauth/token"
RADIOPAEDIA_CASES_URL = "https://radiopaedia.org/api/v1/cases"

# In-memory token cache
_token_cache: dict = {"access_token": None, "expires_at": 0}

# Mapping from Radiopaedia system tags to our GU topic codes
SYSTEM_TO_TOPIC: dict[str, str] = {
    "genitourinary": "kidney",       # default; refined by case tags below
    "adrenal": "adrenal",
    "kidney": "kidney",
    "bladder": "bladder",
    "prostate": "prostate",
    "ureter": "ureter",
    "urethra": "urethra",
    "testis": "scrotum",
    "scrotum": "scrotum",
    "ovary": "female_gu",
    "uterus": "female_gu",
    "cervix": "female_gu",
    "retroperitoneum": "retroperitoneum",
}


async def _get_access_token() -> str | None:
    """Fetch or return cached OAuth2 access token."""
    if not settings.radiopaedia_client_id or not settings.radiopaedia_client_secret:
        logger.warning("Radiopaedia API credentials not configured.")
        return None

    now = time.time()
    if _token_cache["access_token"] and now < _token_cache["expires_at"] - 60:
        return _token_cache["access_token"]

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                RADIOPAEDIA_TOKEN_URL,
                data={
                    "grant_type": "client_credentials",
                    "client_id": settings.radiopaedia_client_id,
                    "client_secret": settings.radiopaedia_client_secret,
                },
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            _token_cache["access_token"] = data["access_token"]
            _token_cache["expires_at"] = now + data.get("expires_in", 3600)
            logger.info("Radiopaedia access token refreshed.")
            return _token_cache["access_token"]
        except Exception as e:
            logger.error(f"Failed to get Radiopaedia token: {e}")
            return None


def _infer_topic(case_data: dict) -> str:
    """Infer our GU topic code from Radiopaedia case tags/systems."""
    tags = [t.lower() for t in (case_data.get("tags") or [])]
    systems = [s.lower() for s in (case_data.get("systems") or [])]

    for tag in tags + systems:
        for keyword, topic in SYSTEM_TO_TOPIC.items():
            if keyword in tag:
                return topic
    return "kidney"  # default fallback for GU system


def _infer_modality(case_data: dict) -> str | None:
    """Infer imaging modality from case data."""
    title = (case_data.get("title") or "").lower()
    tags = " ".join(t.lower() for t in (case_data.get("tags") or []))
    text = title + " " + tags
    if "mri" in text or "magnetic" in text:
        return "MRI"
    if "ct" in text or "computed tomography" in text:
        return "CT"
    if "ultrasound" in text or " us " in text:
        return "US"
    if "x-ray" in text or "radiograph" in text or "plain film" in text:
        return "XR"
    if "nuclear" in text or "scintigraphy" in text or "pet" in text:
        return "NM"
    return None


def _case_to_draft_question(case_data: dict) -> dict | None:
    """
    Convert a Radiopaedia case to a draft question dict.
    MCQ options are left as placeholders for professor to fill in.
    """
    title = case_data.get("title", "")
    case_id = str(case_data.get("id", ""))
    presentation = case_data.get("presentation", "")
    findings = case_data.get("findings", "")

    # Build question text from case presentation
    if presentation:
        question_text = f"{presentation.strip()} What is the most likely diagnosis?"
    else:
        question_text = f"Review the imaging. {title}. What is the most likely diagnosis?"

    # Get first image
    images = case_data.get("images", []) or []
    image_url = None
    if images:
        img = images[0]
        image_url = img.get("thumb_url") or img.get("url") or f"https://radiopaedia.org/cases/{case_id}"
    else:
        image_url = f"https://radiopaedia.org/cases/{case_id}"

    topic = _infer_topic(case_data)
    modality = _infer_modality(case_data)

    return {
        "source": "radiopaedia",
        "external_id": f"rp_{case_id}",
        "question_text": question_text,
        # Placeholders — professor must fill these in before activating
        "option_a": f"[Professor: enter diagnosis option A — correct answer from case: {title}]",
        "option_b": "[Professor: enter distractor option B]",
        "option_c": "[Professor: enter distractor option C]",
        "option_d": "[Professor: enter distractor option D]",
        "correct_answer": "A",  # default — professor must verify
        "explanation": findings[:1000] if findings else f"See Radiopaedia case: {title}",
        "reference": f"https://radiopaedia.org/cases/{case_id}",
        "image_url": image_url,
        "image_frames": None,
        "image_type": modality,
        "is_image_based": True,
        "topic": topic,
        "subtopic": None,
        "modality": modality,
        "difficulty": "intermediate",
        "tags": json.dumps(case_data.get("tags", [])),
        "is_active": False,
        "status": "draft",
    }


async def sync_radiopaedia_cases(
    db: AsyncSession,
    topic_filter: str = "genitourinary",
    limit: int = 20,
) -> dict:
    """
    Radiopaedia API integration is currently disabled.
    Radiopaedia blocks API and iframe access via anti-scraping measures.
    Use JSON file import to add questions instead.
    """
    return {
        "error": "Radiopaedia integration is currently unavailable. Use JSON import to add questions.",
        "fetched": 0,
        "imported": 0,
        "skipped": 0,
    }

    # Preserved for future re-enablement:
    token = await _get_access_token()  # noqa: unreachable
    if not token:
        return {"error": "Radiopaedia API credentials not configured or token fetch failed.", "fetched": 0, "imported": 0, "skipped": 0}

    headers = {"Authorization": f"Bearer {token}"}
    fetched = 0
    imported = 0
    skipped = 0

    async with httpx.AsyncClient(timeout=30) as client:
        page = 1
        while fetched < limit:
            try:
                resp = await client.get(
                    RADIOPAEDIA_CASES_URL,
                    headers=headers,
                    params={"system": topic_filter, "page": page, "per_page": min(20, limit - fetched)},
                )
                resp.raise_for_status()
                cases = resp.json()
            except Exception as e:
                logger.error(f"Radiopaedia API error: {e}")
                break

            if not cases:
                break

            for case_data in cases:
                fetched += 1
                external_id = f"rp_{case_data.get('id', '')}"

                # Check for existing
                existing = await db.execute(
                    select(Question).where(Question.external_id == external_id)
                )
                if existing.scalar_one_or_none():
                    skipped += 1
                    continue

                draft = _case_to_draft_question(case_data)
                if not draft:
                    skipped += 1
                    continue

                q = Question(**draft)
                db.add(q)
                imported += 1

            await db.commit()
            page += 1

            if len(cases) < 20:
                break

    logger.info(f"Radiopaedia sync: fetched={fetched}, imported={imported}, skipped={skipped}")
    return {"fetched": fetched, "imported": imported, "skipped": skipped}
