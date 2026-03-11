# GU Board Review Platform — Progress Tracker

## Current Sprint: 2 — Session Lifecycle (professor presentation flow)
**Status**: Pending
**Next step**: Implement `POST /api/sessions` (session builder endpoint), `PATCH /advance`, `PATCH /reveal`, then build `PresentationPage.tsx`

---

## Completed Sprints

### Sprint 1 ✅ — Backend Foundation + Frontend Scaffold
**Completed**: 2026-03-10

**Backend:**
- [x] SQLAlchemy models: `Question`, `Session`, `AnswerAggregate`, `Professor`
- [x] Pydantic schemas: `QuestionOut`, `SessionConfigIn`, `AggregateOut`, `SummaryOut`
- [x] `config.py` with pydantic-settings (supports SQLite locally, PostgreSQL on Railway)
- [x] `database.py` with async SQLAlchemy engine + `create_tables()` on startup
- [x] `seed_questions.json` — 25 high-yield GU board questions across 9 topics
- [x] `gu_taxonomy.json` — 9 top-level topics, 40+ subtopics, distractor pools
- [x] `services/content_importer.py` — `seed_from_json()` auto-seeds on empty DB
- [x] `routers/questions.py` — full CRUD + `/stats` + `/drafts` + `/activate`
- [x] `routers/content.py` — JSON file import endpoint
- [x] `main.py` — FastAPI app with CORS, lifespan seeding, static file serving

**Frontend:**
- [x] Vite + React + TypeScript scaffold
- [x] Tailwind CSS configured (dark theme: `surface`, `brand` colors)
- [x] React Router v6 routes wired
- [x] `types/question.ts`, `types/session.ts`
- [x] `api/client.ts` (Axios with JWT interceptor), `api/questions.ts`, `api/sessions.ts`, `api/answers.ts`
- [x] `store/sessionStore.ts` (Zustand)
- [x] `SessionBuilderPage.tsx` — full form: topics (with live counts), question count, image mix slider, modality chips, difficulty, timer
- [x] `ResidentJoinPage.tsx` — session code entry, navigates to resident session

---

## Sprint 2 — Session Lifecycle (Days 5-9)
**Goal**: Create sessions, navigate questions, reveal answers on professor screen (REST polling only, no WS yet)

**Backend TODOs:**
- [ ] `services/session_builder.py` — question selection logic (topic/modality/difficulty/image-ratio filters + random sampling)
- [ ] `routers/sessions.py` — `POST /sessions`, `PATCH /sessions/{id}/start`, `PATCH /sessions/{id}/advance`, `PATCH /sessions/{id}/reveal`, `PATCH /sessions/{id}/complete`
- [ ] `routers/auth.py` — professor JWT login
- [ ] Wire session routers into `main.py`

**Frontend TODOs:**
- [ ] `SessionBuilderPage.tsx` — wire submit to `sessionsApi.create()`; redirect to presentation page
- [ ] `PresentationPage.tsx` — full professor session screen: QuestionCard, ImageViewer, ChoiceList, RevealPanel, NavigationBar, ProgressIndicator, SessionTimer
- [ ] `components/presentation/ImageViewer.tsx` — iframe embed for Radiopaedia, zoomable img for local
- [ ] `components/presentation/RevealPanel.tsx`
- [ ] `components/presentation/AggregateBar.tsx` (stub — data wired in Sprint 4)
- [ ] `pages/ProfessorDashboard.tsx` — list recent sessions, link to builder

---

## Sprint 3 — Summary + Auth (Days 10-12)
- [ ] `GET /api/sessions/{id}/summary` endpoint
- [ ] `SummaryPage.tsx` with per-topic breakdown and question review list
- [ ] Professor login: `POST /api/auth/login` → JWT
- [ ] Protected route wrapper in React
- [ ] `ProfessorDashboard.tsx` with session history

---

## Sprint 4 — WebSockets + Resident Participation (Days 13-18)
- [ ] `services/websocket_manager.py` — ConnectionManager
- [ ] `ws/session_ws.py` — WS endpoint
- [ ] Modify advance/reveal endpoints to broadcast WS events
- [ ] `POST /api/answers` — increment aggregate, broadcast aggregate_update
- [ ] `useSessionSocket.ts` hook
- [ ] `AggregateBar.tsx` — live resident answer bars
- [ ] Resident flow: `ResidentSessionPage.tsx`, `WaitingScreen`, `ResidentQuestion`, `RevealFeedback`
- [ ] QR code display on PresentationPage (`qrcode.react`)

---

## Sprint 5 — Radiopaedia Integration + UX Polish (Days 19-24)
- [ ] `services/radiopaedia.py` — OAuth2 client, case fetch, draft import
- [ ] `POST /api/content/sync-radiopaedia`
- [ ] `QuestionReviewPage.tsx` — draft queue for professor to review/activate Radiopaedia imports
- [ ] Fullscreen mode on PresentationPage (browser Fullscreen API)
- [ ] Server-side timer (`asyncio.Task` emitting `timer_tick` WS events)
- [ ] Keyboard shortcuts: `→` = next, `Space` = reveal, `←` = prev

---

## Sprint 6 — Hardening + Documentation (Days 25-28)
- [ ] WS auto-reconnect logic in `useSessionSocket.ts`
- [ ] Error boundaries in React
- [ ] `pytest` tests for `session_builder.py` and WS manager
- [ ] `README.md` — setup, deployment, how to run a session
- [ ] `run.sh` — single-command local startup
- [ ] `docker-compose.yml`
- [ ] Load test: 30 concurrent WS connections

---

## Known Issues / Blockers
- None at this stage

---

## Deployment Config (when ready)
- Frontend: Vercel (`https://gu-board-review.vercel.app`)
- Backend: Railway (`https://gu-board-review.up.railway.app`)
- DB: PostgreSQL via Railway plugin (switch `DATABASE_URL` from SQLite to `postgresql+asyncpg://...`)
- Env vars needed: `SECRET_KEY`, `PROFESSOR_USERNAME`, `PROFESSOR_PASSWORD`, `CORS_ORIGINS`
