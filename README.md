# FAB Finance 💰

AI-powered personal finance tracker built with FastAPI + Next.js.

## Project Structure

```
FAB/
├── backend/          # FastAPI Python backend
│   ├── main.py
│   ├── routers/
│   ├── requirements.txt
│   └── .env.example
├── frontend/         # Next.js frontend
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── .env.example
├── render.yaml       # Render deployment config
└── README.md
```

## Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env      # Fill in your values
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local   # Fill in your values
npm run dev
```

---

## Deploying to Production

### Step 1 — MongoDB Atlas (Cloud Database)
1. Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database user and get the connection string
3. Whitelist IP `0.0.0.0/0` (allow all) under Network Access

### Step 2 — Deploy Backend to Render
1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New → Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Runtime**: Python 3
5. Add these **Environment Variables** in Render dashboard:

| Variable | Value |
|---|---|
| `MONGODB_URI` | Your Atlas connection string |
| `DB_NAME` | `fab_finance` |
| `JWT_SECRET` | A strong random string |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | `https://YOUR_VERCEL_APP.vercel.app/api/auth/google/callback` |
| `FRONTEND_URL` | `https://YOUR_VERCEL_APP.vercel.app` |
| `GROQ_API_KEY` | Your Groq API key |
| `SMTP_EMAIL` | Your Gmail address |
| `SMTP_PASSWORD` | Your Gmail App Password |

6. Note your Render URL: `https://fab-finance-backend.onrender.com`

### Step 3 — Deploy Frontend to Vercel
1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo
3. Settings:
   - **Root Directory**: `frontend`
   - **Framework**: Next.js (auto-detected)
4. Add these **Environment Variables** in Vercel dashboard:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | `https://fab-finance-backend.onrender.com` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | From Google Cloud Console |

5. Deploy! Note your Vercel URL: `https://your-app.vercel.app`

### Step 4 — Update Render env vars
Go back to Render and update:
- `GOOGLE_REDIRECT_URI` → `https://your-app.vercel.app/api/auth/google/callback`
- `FRONTEND_URL` → `https://your-app.vercel.app`

### Step 5 — Update Google Cloud Console
In [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → your OAuth Client:
- Add to **Authorized redirect URIs**: `https://your-app.vercel.app/api/auth/google/callback`
- Add to **Authorized JavaScript origins**: `https://your-app.vercel.app`

---

## Tech Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python, Motor (async MongoDB)
- **Database**: MongoDB Atlas
- **AI**: Groq (LLaMA), Google Gemini, OpenAI (with fallback)
- **Auth**: JWT + Google OAuth2
