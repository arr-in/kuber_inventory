# Local Development

## Backend

1. **Create virtualenv**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate   # Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your MONGO_URL, DB_NAME, JWT_SECRET_KEY
   ```

4. **Run seed (creates admin if DB is empty)**
   ```bash
   python seed.py
   ```

5. **Start server**
   ```bash
   ./start.sh
   # or: uvicorn server:app --reload --port 8001
   ```

- Health: http://localhost:8001/health
- API docs: http://localhost:8001/docs

## Frontend

1. **Install & configure**
   ```bash
   cd frontend
   yarn install   # or npm install
   cp .env.example .env
   # Set REACT_APP_BACKEND_URL=http://localhost:8001
   ```

2. **Start**
   ```bash
   yarn start   # or npm start
   ```

## Vercel (Frontend Deploy)

- Connect repo, set root to `frontend`
- Add env var: `REACT_APP_BACKEND_URL` = your backend URL
- Build uses `craco build` (configured in package.json)
