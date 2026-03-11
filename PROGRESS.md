# GU Board Review Platform — Progress Tracker

## Current Sprint: 5 — Radiopaedia Integration + UX Polish
**Status**: Pending
**Next step**: Implement `services/radiopaedia.py` OAuth2 client + case-to-draft import; build `QuestionReviewPage.tsx` draft queue for reviewing imported cases

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

## Sprint 2 ✅ — Session Lifecycle
**Completed**: 2026-03-10

- [x] `services/session_builder.py` — question selection with topic/modality/difficulty/image-ratio + random sampling
- [x] `routers/sessions.py` — full session lifecycle: POST, start, advance, reveal, complete, summary, join-by-code
- [x] `routers/auth.py` — professor JWT login (bcrypt + jose)
- [x] `routers/answers.py` — resident answer submission with aggregate increment
- [x] All routers + WS endpoint wired into `main.py`

## Sprint 3 ✅ — Summary + Auth + Dashboard
**Completed**: 2026-03-10

- [x] `GET /api/sessions/{id}/summary` — per-topic + per-question breakdown
- [x] `SummaryPage.tsx` — overall %, topic bars, expandable question review list
- [x] `ProfessorDashboard.tsx` — session list, question bank stats, quick nav
- [x] `routers/auth.py` — `/api/auth/login` + `/api/auth/me`

## Sprint 4 ✅ — WebSockets + Resident Participation
**Completed**: 2026-03-10

- [x] `services/websocket_manager.py` — ConnectionManager (professor + resident pools per session)
- [x] `ws/session_ws.py` — WS endpoint with initial state sync on connect
- [x] All state-mutating REST endpoints broadcast WS events on change
- [x] `useSessionSocket.ts` — WS hook with auto-reconnect (3s)
- [x] `useSessionTimer.ts` — client-side countdown timer hook
- [x] `components/presentation/ImageViewer.tsx` — Radiopaedia iframe embed + local zoom
- [x] `components/presentation/AggregateBar.tsx` — live choice distribution with correct answer highlight
- [x] `PresentationPage.tsx` — full professor screen: image, question, choices, reveal, live aggregate, QR code, keyboard shortcuts (→ next, ← prev, Space = reveal, F = fullscreen)
- [x] `ResidentSessionPage.tsx` — mobile-friendly join flow: waiting → active → reveal feedback → ended

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
