# Deployment Checklist

## Env Vars on Host

Add these to your backend (Render/Railway) and frontend (Vercel) dashboards:

### Backend (Render / Railway)

| Variable | Required | Example |
|----------|----------|---------|
| `MONGO_URL` | Yes | `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority` |
| `DB_NAME` | Yes | `kuber_inventory` |
| `JWT_SECRET_KEY` | Yes | `your-long-random-secret-string` |
| `GEMINI_API_KEY` or `OPENROUTER_API_KEY` | For chatbot | `AIza...` or `sk-or-...` |
| `CORS_ORIGINS` | Yes (prod) | `https://myapp.vercel.app` |

### Frontend (Vercel)

| Variable | Required | Example |
|----------|----------|---------|
| `REACT_APP_BACKEND_URL` | Yes | `https://your-backend.onrender.com` |

## Start Commands

- **Render**: `./start.sh` or `uvicorn server:app --host 0.0.0.0 --port 10000`
- **Railway**: `./start.sh` or `uvicorn server:app --host 0.0.0.0 --port $PORT`

## Seed Script

Run once after deploy:

```bash
# From backend/ with MONGO_URL and DB_NAME set (or in Render/Railway shell)
python seed.py
```

Creates admin `admin@kuber.com` / `admin123` if not present. Does not overwrite existing data.

## Pre-Deploy Check

```bash
cd backend
python check_env.py
```

Exits with error if required vars are missing.

## Summary

1. Deploy backend to Render or Railway
2. Deploy frontend to Vercel
3. Set env vars on both
4. Run `python seed.py` once
5. Verify `/health` and `/docs` on backend
