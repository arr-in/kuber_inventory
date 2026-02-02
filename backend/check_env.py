#!/usr/bin/env python3
"""
Pre-deploy check: fails with clear error if required env vars are missing.
Run before deploying: python check_env.py
"""
import os
import sys
from pathlib import Path

# Load .env if present
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / '.env')
except ImportError:
    pass

REQUIRED = ['MONGO_URL', 'DB_NAME', 'JWT_SECRET_KEY']
AI_KEYS = ['GEMINI_API_KEY', 'OPENROUTER_API_KEY']

def main():
    missing = [k for k in REQUIRED if not os.environ.get(k)]
    if missing:
        print("ERROR: Missing required environment variables:", ", ".join(missing), file=sys.stderr)
        print("Set them in .env or your deployment platform (Render/Railway).", file=sys.stderr)
        sys.exit(1)

    has_ai = any(os.environ.get(k) for k in AI_KEYS)
    if not has_ai:
        print("WARNING: No AI key set. Chatbot will not work.")
        print("  Set GEMINI_API_KEY or OPENROUTER_API_KEY for chatbot support.", file=sys.stderr)
        # Don't exit - chatbot is optional

    if os.environ.get('JWT_SECRET_KEY') == 'your-secret-key-change-in-production':
        print("WARNING: Using default JWT_SECRET_KEY. Set a strong secret in production!", file=sys.stderr)

    print("OK: Required env vars present.")

if __name__ == '__main__':
    main()
