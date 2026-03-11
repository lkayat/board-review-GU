# GU Board Review Platform

A web-based board review platform for radiology residency programs, focused on **genitourinary imaging**. Designed for professor-led live teaching sessions with real-time resident participation.

## Features

- **Session Builder** — configure sessions by topic, modality, difficulty, image mix, and timer
- **Live Presentation** — professor screen with image viewer, reveal answer, teaching points
- **Resident Participation** — residents join via session code or QR code on any device
- **Real-time aggregate** — live bar chart of resident answers updates as they submit
- **Session Summary** — overall score and per-topic breakdown at end of session
- **Radiopaedia Integration** — import GU imaging cases as draft MCQs for professor review
- **GU Taxonomy** — 9 topic areas, 40+ subtopics covering the full ABR Core GU domain

## Quick Start (Local Development)

### Prerequisites
- Python 3.12+
- Node.js 20+

### Run
```bash
bash run.sh
```

This starts:
- Backend API at `http://localhost:8000` (auto-seeds 25 GU board questions)
- Frontend at `http://localhost:5173`

**Professor dashboard**: `http://localhost:5173/dashboard`
**Resident join page**: `http://localhost:5173/join`
**API docs**: `http://localhost:8000/docs`

### First-time setup
```bash
cd backend
cp .env.example .env
# Edit .env to set your PROFESSOR_PASSWORD
```

## Running a Teaching Session

1. Go to **Dashboard → New Session**
2. Select topics, number of questions, image mix, and optional timer
3. Click **Build Session** — you land on the Presentation page
4. Display the **QR code** on the projector — residents scan and join
5. Click **Start Session**
6. Use **→** (or arrow key) to advance, **Space** to reveal the answer
7. Teaching point and live resident answer distribution appear after reveal
8. At the end: **End Session → View Summary**

### Keyboard Shortcuts (Presentation Screen)
| Key | Action |
|-----|--------|
| `→` or `N` | Next question |
| `←` or `P` | Previous question |
| `Space` or `R` | Reveal answer |
| `F` | Toggle fullscreen |

## Adding Questions

### Option 1: JSON Import
Create a `.json` file following the template in `backend/data/seed_questions.json` and upload via:
- Dashboard → Content → Import JSON, or
- `POST /api/content/import-json` (multipart file upload)

### Option 2: Radiopaedia Sync
Configure API credentials in `.env`:
```
RADIOPAEDIA_CLIENT_ID=your_client_id
RADIOPAEDIA_CLIENT_SECRET=your_client_secret
```
Then call:
```
POST /api/content/sync-radiopaedia?topic=genitourinary&limit=20
```
Imported cases appear in **Dashboard → Draft Questions** for professor review. You must fill in the MCQ options and correct answer before activating.

## Deployment

### Frontend → Vercel
1. Push to GitHub (already done)
2. Connect repo to [vercel.com](https://vercel.com)
3. Set root directory to `frontend`
4. Add environment variables:
   ```
   VITE_API_URL=https://your-backend.up.railway.app
   VITE_WS_URL=wss://your-backend.up.railway.app
   ```

### Backend → Railway
1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select `board-review-GU` repo, set root directory to `backend`
3. Add a **PostgreSQL** plugin from Railway dashboard
4. Set environment variables:
   ```
   DATABASE_URL=postgresql+asyncpg://...  (auto-set by Railway plugin)
   SECRET_KEY=<random 32-byte hex>
   PROFESSOR_USERNAME=admin
   PROFESSOR_PASSWORD=<your password>
   CORS_ORIGINS=["https://your-app.vercel.app"]
   ```
5. Railway uses `Procfile` for the start command automatically

> **Note**: The codebase uses SQLite locally and PostgreSQL on Railway. Only `DATABASE_URL` changes — all SQLAlchemy models are database-agnostic.

### Docker Compose (optional)
```bash
docker-compose up --build
```

## Project Structure

```
board-review-gu/
├── backend/
│   ├── main.py              # FastAPI app + WS endpoint
│   ├── models/              # SQLAlchemy ORM models
│   ├── schemas/             # Pydantic request/response schemas
│   ├── routers/             # auth, questions, sessions, answers, content
│   ├── services/            # session_builder, websocket_manager, radiopaedia
│   ├── ws/                  # WebSocket session handler
│   └── data/                # seed_questions.json + gu_taxonomy.json
└── frontend/
    └── src/
        ├── pages/           # Dashboard, Builder, Presentation, Summary, Resident, etc.
        ├── components/      # ImageViewer, AggregateBar
        ├── hooks/           # useSessionSocket, useSessionTimer
        ├── store/           # Zustand session state
        └── api/             # Axios clients
```

## GU Topic Coverage

| Topic | Key Subtopics |
|-------|---------------|
| Kidneys | RCC, Bosniak cysts, AML, stones, infection, trauma, transplant |
| Bladder | Urothelial Ca, cystitis, urachal anomalies, trauma |
| Prostate | PI-RADS, BPH, abscess, staging/ECE |
| Adrenal | Adenoma washout, pheochromocytoma, myelolipoma, metastasis |
| Ureter | Stones, TCC, stricture, UPJ/UVJ obstruction |
| Urethra | Stricture, trauma, carcinoma |
| Scrotum/Testes | Torsion, seminoma/NSGCT, epididymitis, varicocele |
| Female GU | Fibroids, endometrial/cervical/ovarian Ca, endometriosis, O-RADS |
| Retroperitoneum | Lymphoma, sarcoma, fibrosis, hematoma |
