# GU Board Review — Question Generator

Paste this entire file into Claude Code chat (or any Claude conversation), fill in the parameters below, and Claude will output a `.json` file ready to import into the Question Bank via **↑ Import JSON**.

---

## Parameters — fill these in before pasting

```
TOPIC:      kidney
            (options: kidney | bladder | prostate | adrenal | ureter | urethra | scrotum | female_gu | retroperitoneum)

DIFFICULTY: intermediate
            (options: basic | intermediate | advanced)

COUNT:      5
            (1–20 questions)

MODALITY:   (leave blank for Claude to choose the most appropriate)
            (options: CT | MR | US | Nuclear | Radiograph | Any)

KEYWORDS:   (leave blank, or enter specific subtopics, classification systems, or clinical scenarios)
            Examples: "Bosniak IIF follow-up criteria", "PI-RADS 4 vs 5 distinction",
                      "transplant renal artery stenosis", "O-RADS lexicon", "AAST renal trauma grading"
```

---

## Prompt (paste everything below this line into Claude)

---

You are an expert genitourinary radiology board review question author. Generate exactly **{COUNT}** high-yield multiple-choice questions with the following parameters:

- **Topic:** {TOPIC_LABEL}
- **Difficulty:** {DIFFICULTY}
- **Modality:** {MODALITY or "Claude's choice — whichever is most clinically appropriate"}
- **Keywords / focus:** {KEYWORDS or "general high-yield content for this topic"}

**Difficulty guidance:**
- Basic: core definitions, key imaging findings, classic presentations — early residency level
- Intermediate: applying classification systems (Bosniak, PI-RADS, O-RADS, AAST, FIGO, etc.), distinguishing similar entities, integrating clinical context — mid-residency level
- Advanced: multi-step reasoning, nuanced staging criteria, uncommon high-yield entities, management nuances — fellowship / board exam level

**Requirements:**
1. Every clinical detail must be accurate — HU values, enhancement patterns, classification criteria, staging, and management must match current guidelines.
2. All four answer choices must be plausible; avoid obviously wrong distractors.
3. Explanations must cite the specific classification system, criteria, or guideline that justifies the correct answer AND explain why each distractor is wrong.
4. Include a real journal reference (Author et al. Journal Year;vol:pages).
5. All questions are text-only clinical vignettes — no images.

**Output:** Return ONLY a valid JSON array (no markdown fences, no commentary before or after), with exactly {COUNT} objects, each containing these exact fields:

```json
[
  {
    "source": "ai_generated",
    "question_text": "<full clinical vignette ending with the question>",
    "option_a": "<choice A>",
    "option_b": "<choice B>",
    "option_c": "<choice C>",
    "option_d": "<choice D>",
    "correct_answer": "<A|B|C|D>",
    "explanation": "<thorough explanation: why correct answer is right, why each distractor is wrong, citing specific criteria>",
    "reference": "<Author et al. Journal Year;vol:pages>",
    "image_url": null,
    "image_frames": null,
    "image_type": "<CT|MR|US|Nuclear|Radiograph|Any>",
    "is_image_based": false,
    "topic": "<topic_code>",
    "subtopic": "<topic_code.specific_subtopic>",
    "modality": "<CT|MR|US|Nuclear|Radiograph|Any>",
    "difficulty": "<basic|intermediate|advanced>",
    "tags": ["<tag1>", "<tag2>", "<tag3>"]
  }
]
```

After generating, save the output as a `.json` file so I can import it into the Question Bank.

---

## How to use

1. Fill in the parameters at the top of this file.
2. Replace the `{PLACEHOLDERS}` in the prompt with your values.
3. Paste the filled-in prompt into a Claude conversation (this chat or any Claude interface).
4. Save the JSON output as a file (e.g., `kidney-bosniak-5q.json`).
5. In the Question Bank, click **↑ Import JSON** and select the file.
6. All imported questions land in **Pending Review** — review and approve before they appear in sessions.

## Valid topic codes

| Code | Label |
|------|-------|
| `kidney` | Kidneys |
| `bladder` | Bladder |
| `prostate` | Prostate |
| `adrenal` | Adrenal Glands |
| `ureter` | Ureter |
| `urethra` | Urethra |
| `scrotum` | Scrotum / Testes |
| `female_gu` | Female GU |
| `retroperitoneum` | Retroperitoneum |
