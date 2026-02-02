# Backend Deployment (Render & Railway)

## Prerequisites

- MongoDB (MongoDB Atlas recommended for cloud)
- Python 3.10+

## Render

1. Create a new **Web Service**
2. Connect your repo, set root directory to `backend` (or use Build Command: `pip install -r requirements.txt`)
3. **Build Command**: `pip install -r requirements.txt`
4. **Start Command**: `./start.sh` or `uvicorn server:app --host 0.0.0.0 --port 10000`
5. Render sets `PORT=10000` by default; `start.sh` uses it
6. Add environment variables (see below)

## Railway

1. Create a new project, add a service from GitHub
2. Set root to `backend` or ensure `requirements.txt` is at project root
3. **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - Or use `./start.sh` (Railway sets `PORT` automatically)
4. Add environment variables (see below)

## Required Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGO_URL` | MongoDB connection string (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/...`) |
| `DB_NAME` | Database name (e.g. `kuber_inventory`) |
| `JWT_SECRET_KEY` | Secret for JWT tokens (generate a strong random string) |

## Optional (Chatbot)

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key (preferred) |
| `OPENROUTER_API_KEY` | OpenRouter API key (fallback) |

## CORS

| Variable | Description |
|----------|-------------|
| `CORS_ORIGINS` | Comma-separated allowed origins (e.g. `https://myapp.vercel.app`) |

## Post-Deploy

1. Run seed once to create admin: `python seed.py`
   - Run in Render/Railway shell, or locally with `MONGO_URL` and `DB_NAME` pointing to production DB
2. Verify: `GET /health` → `{"status":"ok"}`
3. OpenAPI docs: `GET /docs`
