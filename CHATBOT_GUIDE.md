# Chatbot Integration Guide

## Overview

The Kuber Inventory System now includes an AI-powered chatbot that answers questions about your inventory using **real data** from your database.

## How It Works

1. **User asks a question** → Frontend sends to `/api/chat`
2. **Backend fetches real inventory data** → MongoDB queries for products, categories, stats
3. **Backend sends data + question to Google Gemini** → AI formats response using real numbers
4. **AI responds in natural language** → User gets accurate answer

## Setup (Required)

### 1. Get Gemini API Key (FREE)

1. Visit https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Select "Create API key in new project" or use existing project
5. Copy the API key (starts with `AIza...`)

### 2. Add to Environment Variables

**Backend `.env` file:**
```env
GEMINI_API_KEY=AIza-your-key-here
```

**Important**: 
- Never commit API keys to Git
- Add `.env` to `.gitignore`
- Use environment variables in production

### 3. Restart Backend

```bash
# If using supervisor
sudo supervisorctl restart backend

# If running manually
# Stop the server and restart with:
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

## Usage

### Opening the Chatbot

- Look for the green chat bubble at the bottom-right of the screen
- Click to open the chat window
- Only visible when logged in

### Example Questions

**Stock Queries:**
- "How many Gold Necklaces do we have in stock?"
- "What's the stock level for SKU KBR-JW-001?"
- "Do we have any Diamond Pendants available?"

**Low Stock Alerts:**
- "Which products are running low?"
- "Show me out of stock items"
- "What products need restocking?"

**Inventory Summaries:**
- "How many products do we have in total?"
- "What's the total value of our inventory?"
- "How many categories do we have?"

**Category Queries:**
- "How many Jewellery items do we have?"
- "List products in Textiles category"
- "What's the value of Handicrafts inventory?"

## Technical Details

### Model Used
- **Provider**: Google Gemini
- **Model**: `gemini-1.5-flash`
- **Cost**: FREE (15 requests per minute, 1 million tokens per day)
- **API Docs**: https://ai.google.dev/gemini-api/docs

### Data Flow

```
User Question
    ↓
Frontend (Chatbot.js)
    ↓
POST /api/chat
    ↓
Backend fetches from MongoDB:
  - All products
  - Categories
  - Stats (total value, low stock count)
    ↓
Backend prepares inventory context with REAL numbers
    ↓
Google Gemini API call with context + question
    ↓
AI formats response using only provided data
    ↓
Response sent back to user
```

### Security

- Chatbot requires authentication (JWT token)
- Only logged-in admins can use it
- API key stored securely in environment variables
- No inventory data sent to AI - only aggregated summaries

## Code Changes Made

### Backend (`server.py`)
- Added `POST /api/chat` endpoint
- Fetches real inventory data from MongoDB
- Calls OpenRouter API with data context
- Returns AI-formatted response

### Frontend
- Created `Chatbot.js` component
- Floating button at bottom-right
- Chat window with message history
- Input field with send button

### App.js
- Integrated Chatbot component
- Only shows when user is authenticated

## Troubleshooting

### "API key not found" error
- Make sure `GEMINI_API_KEY` is in `backend/.env`
- Restart backend after adding the key
- Check for typos in the key
- Ensure key starts with `AIza`

### Chatbot not visible
- Make sure you're logged in
- Chat button only appears after authentication
- Check browser console for errors

### "Failed to get response"
- Verify internet connection
- Check Google AI Studio status: https://status.cloud.google.com/
- Look at backend logs: `tail -f /var/log/supervisor/backend.err.log`
- Verify API key is valid at https://aistudio.google.com/app/apikey

### AI gives wrong numbers
- The chatbot uses real data from your database
- If numbers seem wrong, check your inventory in the Products page
- The AI should never make up numbers

## Deployment Considerations

### Environment Variables

**Development:**
```env
GEMINI_API_KEY=AIza...
```

**Production (Vercel/Netlify):**
- Add env var in hosting dashboard
- Never commit `.env` files

**Production (Railway/Render):**
- Add env var in settings
- Restart service after adding

### Free Tier Limits

Google Gemini free tier includes:
- Gemini 1.5 Flash model (free forever)
- 15 requests per minute
- 1 million tokens per day
- No credit card required

For production with high traffic:
- Monitor usage at https://aistudio.google.com/
- Consider rate limiting on your end
- Upgrade to paid tier if needed

## Customization

### Change AI Model

Edit `server.py` in the `/api/chat` endpoint:

```python
# Change from gemini-1.5-flash to gemini-1.5-pro for better responses
f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={gemini_api_key}"
```

Available Gemini models:
- `gemini-1.5-flash` (Fast, free)
- `gemini-1.5-pro` (More capable, free with limits)
- `gemini-1.0-pro` (Legacy, still supported)

### Adjust Response Length

Change `maxOutputTokens` in the API call:

```python
"maxOutputTokens": 500,  # Increase for longer responses
```

### Modify AI Personality

Edit the system prompt in `server.py`:

```python
"content": f"""You are a helpful inventory assistant for Kuber...
```

## Export Instructions

To export this project for GitHub/Vercel:

1. **Copy the entire `/app` folder**
2. **Remove sensitive files:**
   ```bash
   rm backend/.env
   rm frontend/.env
   ```
3. **Create `.env.example` files:**
   
   `backend/.env.example`:
   ```env
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=kuber_inventory
   CORS_ORIGINS=*
   JWT_SECRET_KEY=your-secret-key
   OPENROUTER_API_KEY=your-openrouter-key
   ```
   
   `frontend/.env.example`:
   ```env
   REACT_APP_BACKEND_URL=http://localhost:8001
   ```

4. **Commit to Git:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

5. **Deploy:**
   - Frontend: Vercel/Netlify
   - Backend: Railway/Render/DigitalOcean
   - Database: MongoDB Atlas (free tier)

## Cost Analysis

**Free Forever:**
- OpenRouter Llama 3.2 3B (free tier)
- MongoDB Atlas (512MB free)
- Vercel (Frontend hosting)
- Railway (Free tier available)

**Paid Options (if needed):**
- OpenRouter: Pay per token (very cheap)
- MongoDB Atlas: Starts at $9/mo for more storage
- Railway: ~$5/mo for backend
- Vercel: $20/mo for Pro features

## Support

If you encounter issues:
1. Check backend logs
2. Verify environment variables
3. Test API endpoint directly with curl
4. Check OpenRouter dashboard for API usage

## Future Enhancements

Possible improvements:
- Add conversation history persistence
- Voice input support
- Export chat transcripts
- Multi-language support
- Custom training on company-specific terms
