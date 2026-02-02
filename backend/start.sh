#!/usr/bin/env bash
# Backend start script for Render (default port 10000) and Railway (uses $PORT)
PORT=${PORT:-10000}
exec uvicorn server:app --host 0.0.0.0 --port $PORT
