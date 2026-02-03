# Free Cloud Deployment Guide

Deploy everything to free tiers: **no local MongoDB or Python needed**. MongoDB Atlas works perfectly when your backend runs in the cloud.

---

## Step 1: Push to GitHub

```bash
cd /Users/samx/Desktop/kuber_inventory
git add -A
git commit -m "Add cloud deploy support"
git push origin main
```

(If you don’t have a GitHub repo yet, create one and push.)

---

## Step 2: Deploy Backend to Render (Free)

1. Go to [render.com](https://render.com) → Sign up (free).
2. **New** → **Web Service**.
3. Connect your GitHub repo.
4. Settings:
   - **Name:** `kuber-inventory-api`
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `./start.sh`
5. **Environment Variables** (Add each):
   | Key | Value |
   |-----|-------|
   | `MONGO_URL` | Your Atlas connection string (from MongoDB Atlas → Connect → Drivers) |
   | `DB_NAME` | `kuber-inventory` |
   | `JWT_SECRET_KEY` | `kuber_inventory_secret_key_2024_change_in_production` |
   | `GEMINI_API_KEY` | Your Gemini API key |
   | `CORS_ORIGINS` | `*` (or your Vercel URL after Step 4) |
   | `SEED_SECRET` | `your-random-secret-123` (pick any string, keep private) |
6. **Create Web Service**.

7. Wait for deploy. Note the backend URL, e.g. `https://kuber-inventory-api.onrender.com`.

---

## Step 3: Run Seed (Create Admin)

After the backend is live, run the seed once:

```bash
curl -X POST https://YOUR-BACKEND-URL.onrender.com/api/seed \
  -H "X-Seed-Key: your-random-secret-123"
```

Replace:
- `YOUR-BACKEND-URL` with your actual Render URL
- `your-random-secret-123` with the `SEED_SECRET` you set

Success looks like: `{"message":"Seed complete","email":"admin@kuber.com","password":"admin123"}`

---

## Step 4: Deploy Frontend to Vercel (Free)

1. Go to [vercel.com](https://vercel.com) → Sign up (free).
2. **Add New** → **Project**.
3. Import your GitHub repo.
4. Settings:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Create React App
5. **Environment Variables:**
   | Key | Value |
   |-----|-------|
   | `REACT_APP_BACKEND_URL` | `https://YOUR-BACKEND-URL.onrender.com` |
6. **Deploy**.

7. Note the frontend URL, e.g. `https://kuber-inventory.vercel.app`.

---

## Step 5 (Optional): Tighten CORS

If you used `CORS_ORIGINS=*`, you can restrict it to your frontend later:
1. Render Dashboard → your backend service → **Environment**.
2. Set `CORS_ORIGINS` = `https://your-actual-vercel-url.vercel.app`
3. Save.

---

## MongoDB Atlas: Allow Render IPs

1. MongoDB Atlas → your project → **Network Access**.
2. **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`) for cloud hosting.
3. **Confirm**.

---

## Login

- **URL:** Your Vercel frontend URL
- **Email:** `admin@kuber.com`
- **Password:** `admin123`

---

## Summary

| Service | Platform | Free Tier |
|---------|----------|-----------|
| Backend | Render | ✅ |
| Frontend | Vercel | ✅ |
| Database | MongoDB Atlas | ✅ M0 |

Render’s free tier spins down after 15 minutes of inactivity; the first request may take 30–60 seconds to wake it up.
