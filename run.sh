#!/usr/bin/env bash
# GU Board Review — Local Development Startup
# Starts backend (port 8000) and frontend dev server (port 5173) in parallel.
# Residents connect to: http://<your-ip>:5173/join

set -e

echo "==> Starting GU Board Review Platform (local dev)"
echo ""

# Backend
echo "==> Starting FastAPI backend on :8000 ..."
cd backend
if [ ! -d ".venv" ]; then
  echo "==> Creating Python virtualenv..."
  python -m venv .venv
fi
source .venv/bin/activate 2>/dev/null || source .venv/Scripts/activate 2>/dev/null
pip install -q -r requirements.txt
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "==> Created .env from .env.example — edit it to set your password."
fi
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Frontend
echo "==> Starting Vite frontend on :5173 ..."
cd frontend
if [ ! -d "node_modules" ]; then
  echo "==> Installing frontend dependencies..."
  npm install
fi
npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!
cd ..

echo ""
echo "==> Platform running!"
echo "    Professor dashboard: http://localhost:5173/dashboard"
echo "    Resident join page:  http://localhost:5173/join"
echo "    API docs:            http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
