import json
import os
from typing import Optional

import anthropic

TOPIC_LABELS = {
    "kidney": "Kidneys",
    "bladder": "Bladder",
    "prostate": "Prostate",
    "adrenal": "Adrenal Glands",
    "ureter": "Ureter",
    "urethra": "Urethra",
    "scrotum": "Scrotum / Testes",
    "female_gu": "Female GU (uterus, ovaries, vulva)",
    "retroperitoneum": "Retroperitoneum",
}


def _build_prompt(
    topic: str,
    difficulty: str,
    count: int,
    subtopic: Optional[str],
    modality: Optional[str],
    keywords: Optional[str],
) -> str:
    topic_label = TOPIC_LABELS.get(topic, topic)
    subtopic_line = f"- Subtopic / focus: {subtopic}" if subtopic else ""
    modality_line = f"- Imaging modality: {modality}" if modality else "- Imaging modality: Any (CT, MR, US, Nuclear — whichever is most clinically relevant)"
    keywords_line = f"- Keywords / special focus: {keywords}" if keywords else ""
    modality_for_field = modality or "Any"

    difficulty_guidance = {
        "basic": "Basic questions test core definitions, key imaging findings, and classic presentations. Appropriate for early residency.",
        "intermediate": "Intermediate questions require applying classification systems (e.g., Bosniak, PI-RADS, O-RADS, AAST), distinguishing similar entities, or integrating clinical context. Appropriate for mid-level residents.",
        "advanced": "Advanced questions require multi-step reasoning, nuanced staging criteria, uncommon but high-yield entities, or management nuances. Appropriate for fellows and board examination.",
    }.get(difficulty, "")

    return f"""You are an expert genitourinary radiology board review question author. Generate exactly {count} high-yield multiple-choice question(s) with the following parameters:

- Topic: {topic_label}
{subtopic_line}
- Difficulty: {difficulty.upper()} — {difficulty_guidance}
{modality_line}
{keywords_line}

Requirements:
1. Every clinical detail must be accurate — imaging findings, HU values, classification criteria, staging systems, and management recommendations must match current guidelines.
2. All four answer choices must be plausible; avoid obviously incorrect distractors.
3. Questions should test: pattern recognition, classification systems (Bosniak, PI-RADS, O-RADS, AAST, FIGO, etc.), staging, and clinical management decisions.
4. Explanations must cite the specific classification system, criteria, or guideline that justifies the correct answer and explains why each distractor is wrong.
5. Include a real journal reference (Author et al. Journal Year;vol:pages).
6. Do NOT generate image-based questions — all questions must be text-only clinical vignettes.

Return ONLY a valid JSON array (no markdown, no commentary) containing exactly {count} object(s), each with EXACTLY these fields:

{{
  "source": "ai_generated",
  "question_text": "<full clinical vignette + question>",
  "option_a": "<choice A>",
  "option_b": "<choice B>",
  "option_c": "<choice C>",
  "option_d": "<choice D>",
  "correct_answer": "<A|B|C|D>",
  "explanation": "<thorough explanation citing classification criteria, why correct answer is right, why distractors are wrong>",
  "reference": "<Author et al. Journal Year;vol:pages>",
  "image_url": null,
  "image_frames": null,
  "image_type": "{modality_for_field}",
  "is_image_based": false,
  "topic": "{topic}",
  "subtopic": "<{topic}.specific_subtopic_slug>",
  "modality": "{modality_for_field}",
  "difficulty": "{difficulty}",
  "tags": ["<tag1>", "<tag2>", "<tag3>"]
}}"""


async def generate_questions_with_ai(
    topic: str,
    difficulty: str,
    count: int,
    subtopic: Optional[str] = None,
    modality: Optional[str] = None,
    keywords: Optional[str] = None,
    api_key: Optional[str] = None,
) -> list[dict]:
    """Call Claude API to generate radiology board review questions.
    Returns a list of question dicts matching seed_questions.json format.
    Raises ValueError if the API key is missing or the response is unparseable.
    """
    key = api_key or os.environ.get("ANTHROPIC_API_KEY", "")
    if not key:
        raise ValueError(
            "ANTHROPIC_API_KEY is not configured. Set it in your .env file "
            "or Railway environment variables."
        )

    client = anthropic.AsyncAnthropic(api_key=key)
    prompt = _build_prompt(topic, difficulty, count, subtopic, modality, keywords)

    message = await client.messages.create(
        model="claude-opus-4-6",
        max_tokens=8192,
        thinking={"type": "adaptive"},
        messages=[{"role": "user", "content": prompt}],
    )

    # Extract the text block (skip thinking blocks)
    text = ""
    for block in message.content:
        if block.type == "text":
            text = block.text
            break

    # Strip markdown fences if present
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:])
    if text.endswith("```"):
        text = text[: text.rfind("```")]
    text = text.strip()

    try:
        questions = json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Claude returned invalid JSON: {e}\n\nRaw response:\n{text[:500]}")

    if not isinstance(questions, list):
        raise ValueError("Claude returned a non-array JSON response.")

    return questions
