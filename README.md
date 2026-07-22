# CalmMind / MindEase — Mental Wellness & Stress Tracker

Three independent pieces run together:

```
frontend/    static HTML/CSS/JS — served with any static file server (e.g. Live Server), port 5501
backend/     Node/Express + MongoDB — saves stress logs & chat history, port 4000
ai-service/  Python FastAPI — does the actual AI analysis (text, voice, face), port 8001
```

There used to be a third Node process (`server.js` + `analyze.py`) duplicating face
analysis — it's been removed. `ai-service/main.py`'s `/analyze-face` now handles
facial monitoring on its own.

## 1. Start MongoDB (Docker)

```bash
docker compose up -d
```

This starts:
- MongoDB on `27017` (root / password123 — see `docker-compose.yml`)
- Mongo Express (a web UI for the DB) on `http://localhost:8081` (admin / admin123)

## 2. Start the AI service (Python / FastAPI)

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
cp .env.example .env          # optional: add your OPENAI_API_KEY inside
uvicorn main:app --reload --port 8001
```

Runs on `http://127.0.0.1:8001`. Works with **no API key** — text analysis
falls back to a keyword heuristic and face analysis always uses the local FER
model (no OpenAI needed there at all).

> First run downloads the FER emotion-detection model — this can take a
> minute or two.

## 3. Start the backend (Node / Express)

```bash
cd backend
npm install
cp .env.example .env          # optional: add your OPENAI_API_KEY inside for real chat replies
npm run dev
```

Runs on `http://localhost:4000`. Also works with **no API key** — `/chat`
falls back to canned supportive replies instead of calling OpenAI.

## 4. Serve the frontend

Open `frontend/` with any static server, e.g. VS Code's "Live Server"
extension, or:

```bash
cd frontend
npx serve -l 5501
```

Then visit `http://127.0.0.1:5501/index.html`.

## What talks to what

| Page | Calls | Purpose |
|---|---|---|
| `stress.html` | `ai-service:8001/analyze-text` then `backend:4000/stress/log` | analyze text, then save the result |
| `chat.html` | `backend:4000/chat` | chatbot reply (OpenAI or fallback) + saves history |
| `facial_expression_monitoring_system.html` | `ai-service:8001/analyze-face` | webcam frame → emotion + stress score |
| `voice_tone.html` | nothing — fully client-side | mic → pitch/loudness heuristic, no backend needed |

## Notes / known limitations

- `/analyze-voice` in `ai-service/main.py` exists but nothing in the frontend
  calls it yet — `voice_tone.html` does its own in-browser analysis instead.
  Wire it up later if you want server-side voice analysis too.
- The heuristic fallbacks (text stress, chat replies) are intentionally
  simple — good enough for a demo, not for production-grade accuracy.
- CORS is wide open (`allow_origins=["*"]`) on both backends — fine for a
  local demo, tighten before deploying anywhere public.
