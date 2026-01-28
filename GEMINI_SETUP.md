# Quick Setup Guide - Gemini Chatbot

## Get Your Free Gemini API Key

1. **Visit Google AI Studio**
   - Go to: https://aistudio.google.com/app/apikey
   - Sign in with your Google account

2. **Create API Key**
   - Click "Create API Key" button
   - Select "Create API key in new project" (or use existing)
   - Copy the generated key (starts with `AIza...`)

3. **Add to Backend**
   ```bash
   # Edit /app/backend/.env file
   nano /app/backend/.env
   
   # Add this line:
   GEMINI_API_KEY=AIzaYourKeyHere
   
   # Save and exit (Ctrl+X, then Y, then Enter)
   ```

4. **Restart Backend**
   ```bash
   # If using supervisor
   sudo supervisorctl restart backend
   
   # If running manually
   # Kill the running process and restart:
   uvicorn server:app --host 0.0.0.0 --port 8001 --reload
   ```

5. **Test the Chatbot**
   - Login to the app
   - Click the green chat button at bottom-right
   - Ask: "How many products do we have?"
   - You should get a response with real inventory data!

## Example Questions

- "How many Gold Necklaces are in stock?"
- "Which products are running low?"
- "What's our total inventory value?"
- "Show me all Jewellery items"
- "Are there any out of stock products?"

## Troubleshooting

### Chatbot says "not configured"
→ Make sure you added GEMINI_API_KEY to `/app/backend/.env` and restarted backend

### Error: "Failed to get response"
→ Check if your API key is valid at https://aistudio.google.com/app/apikey

### Backend not starting
→ Check logs: `tail -f /var/log/supervisor/backend.err.log`

## Free Tier Limits

✅ **15 requests per minute**
✅ **1 million tokens per day**
✅ **No credit card required**

This is more than enough for development and small production use!

## Important Notes

- API key is stored in `.env` file (never commit to Git)
- Chatbot uses REAL data from your MongoDB database
- AI cannot make up numbers - only uses actual inventory data
- Only visible to logged-in users

## Export for Production

Before pushing to GitHub:

1. Remove your API key from `.env`:
   ```bash
   # Create example file
   cp backend/.env backend/.env.example
   
   # Edit .env.example and replace key with placeholder
   nano backend/.env.example
   # Change: GEMINI_API_KEY=your-gemini-api-key-here
   ```

2. Make sure `.env` is in `.gitignore`:
   ```bash
   echo "backend/.env" >> .gitignore
   echo "frontend/.env" >> .gitignore
   ```

3. Add API key in your hosting platform's environment variables

## Next Steps

- Test different questions with the chatbot
- Customize the AI's personality in `server.py`
- Add more inventory data to test responses
- Deploy to production when ready!

---

**Need help?** Check `/app/CHATBOT_GUIDE.md` for detailed documentation.
