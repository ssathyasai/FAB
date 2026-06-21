# 🚀 FAB Finance - Deployment Guide

## ✅ Fixed Issues:
- Updated `requirements.txt` with compatible versions (no Rust compilation needed)
- Added `runtime.txt` to specify Python 3.11

---

## 📋 Deployment Steps

### 1️⃣ Setup MongoDB Atlas (5 minutes)

1. **Go to**: https://www.mongodb.com/cloud/atlas
2. **Sign up** (free account)
3. **Create Cluster**:
   - Click "Build a Database"
   - Choose "FREE" (M0 Sandbox)
   - Provider: AWS
   - Region: Choose closest to you
   - Cluster Name: FAB-Finance
4. **Create Database User**:
   - Database Access → Add New Database User
   - Username: `fabadmin`
   - Password: (Generate secure password, save it!)
   - User Privileges: `Atlas Admin`
5. **Whitelist IP**:
   - Network Access → Add IP Address
   - Add: `0.0.0.0/0` (allow from anywhere)
   - Confirm
6. **Get Connection String**:
   - Clusters → Connect → Connect your application
   - Driver: Python, Version: 3.11 or later
   - Copy connection string
   - Replace `<password>` with your actual password
   - Example: `mongodb+srv://fabadmin:YOUR_PASSWORD@fab-finance.xxxxx.mongodb.net/?retryWrites=true&w=majority`

---

### 2️⃣ Deploy Backend to Render (10 minutes)

1. **Push code to GitHub**:
   ```bash
   cd c:\FAB
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Go to**: https://render.com
3. **Sign up** with GitHub
4. **New → Web Service**
5. **Connect Repository**: Select your FAB repo
6. **Configure**:
   - Name: `fab-finance-backend`
   - Region: Choose closest to you
   - Branch: `main`
   - Root Directory: `backend`
   - Runtime: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Instance Type: Free

7. **Add Environment Variables** (click "Advanced" → "Add Environment Variable"):
   ```
   MONGODB_URI = mongodb+srv://fabadmin:YOUR_PASSWORD@fab-finance.xxxxx.mongodb.net/?retryWrites=true&w=majority
   DB_NAME = fab_finance
   JWT_SECRET = (click "Generate" button)
   GROQ_API_KEY = gsk_YOUR_GROQ_KEY (from https://console.groq.com/)
   GEMINI_API_KEY = YOUR_GEMINI_KEY (optional)
   OPENAI_API_KEY = YOUR_OPENAI_KEY (optional)
   SMTP_SERVER = smtp.gmail.com
   SMTP_PORT = 587
   SMTP_EMAIL = your-email@gmail.com
   SMTP_PASSWORD = your-app-password
   FRONTEND_URL = (leave empty for now, add after frontend deployment)
   BANK_JSON_PATH = /opt/render/project/src/bank.json
   ```

8. **Create Deploy**
9. **Wait** for build (5-10 minutes first time)
10. **Copy Backend URL**: e.g., `https://fab-finance-backend.onrender.com`

---

### 3️⃣ Create bank.json for Backend

After first deploy, add the bank.json file:

1. Go to Render Dashboard → Your Service → Shell
2. Run:
   ```bash
   echo '{"balance": 0}' > /opt/render/project/src/bank.json
   ```

**OR** add this to your backend root (better approach):

Create `c:\FAB\backend\bank.json`:
```json
{"balance": 0}
```

Then update `backend/.env`:
```
BANK_JSON_PATH=./bank.json
```

Commit and push again.

---

### 4️⃣ Deploy Frontend to Vercel (5 minutes)

1. **Go to**: https://vercel.com
2. **Sign up** with GitHub
3. **Add New Project**
4. **Import Repository**: Select your FAB repo
5. **Configure**:
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `frontend`
   - Build Command: `npm run build` (auto)
   - Output Directory: `.next` (auto)
   - Install Command: `npm install` (auto)

6. **Add Environment Variable**:
   ```
   NEXT_PUBLIC_BACKEND_URL = https://fab-finance-backend.onrender.com
   ```
   (Use your actual Render backend URL from step 2)

7. **Deploy**
8. **Wait** for build (2-3 minutes)
9. **Copy Frontend URL**: e.g., `https://fab-finance.vercel.app`

---

### 5️⃣ Update Backend with Frontend URL

1. **Go to Render** → Your Service → Environment
2. **Edit** `FRONTEND_URL` variable
3. **Add** your Vercel URL: `https://fab-finance.vercel.app`
4. **Save** (this will redeploy backend)

---

### 6️⃣ Test Your Deployment

1. **Open your frontend URL**: `https://fab-finance.vercel.app`
2. **Create account** (email + password)
3. **Check email** for OTP (or check Render logs if email not configured)
4. **Verify OTP** and login
5. **Test features**:
   - Dashboard
   - Budget Setup
   - Advisors (Debt, Savings, Investment)
   - Settings

---

## 🔧 Troubleshooting

### Backend Build Fails:
- **Check**: Python version in `runtime.txt` is 3.11.9
- **Check**: `requirements.txt` has compatible versions
- **Check**: All environment variables are set
- **Logs**: Render Dashboard → Logs tab

### Frontend Build Fails:
- **Check**: `NEXT_PUBLIC_BACKEND_URL` is set correctly
- **Check**: Node version (Vercel auto-detects)
- **Logs**: Vercel Dashboard → Deployment → View Function Logs

### CORS Errors:
- **Check**: `FRONTEND_URL` in backend matches your Vercel URL
- **Check**: No trailing slash in URLs

### MongoDB Connection Error:
- **Check**: Connection string has correct password
- **Check**: IP `0.0.0.0/0` is whitelisted
- **Check**: Database user has `Atlas Admin` role

### Backend Sleeps After 15 Minutes (Free Tier):
- **Normal behavior** on Render free tier
- First request after sleep takes 30-60 seconds
- **Solution**: Upgrade to paid plan ($7/month) or use Railway

---

## 💰 Costs

| Service | Free Tier | Limits |
|---------|-----------|--------|
| **MongoDB Atlas** | ✅ Forever | 512MB storage, good for 1000+ users |
| **Render** | ✅ 750 hrs/month | Sleeps after 15 min, wakes on request |
| **Vercel** | ✅ Forever | Unlimited deployments, 100GB bandwidth |

**Total: $0/month** 🎉

---

## 🚀 Upgrade Options (If Needed)

### When to Upgrade:

**MongoDB Atlas** ($0 → Free forever for small apps):
- Upgrade when you have 100+ active users
- Need more than 512MB storage

**Render** ($0 → $7/month):
- Don't want backend to sleep
- Need faster response times
- Expect regular traffic

**Vercel** ($0 → $20/month):
- Need more bandwidth (>100GB/month)
- Need team collaboration features
- Need advanced analytics

---

## ✅ Post-Deployment Checklist

- [ ] MongoDB Atlas cluster created
- [ ] Database user created with password saved
- [ ] IP `0.0.0.0/0` whitelisted
- [ ] Backend deployed on Render
- [ ] All environment variables set on Render
- [ ] `bank.json` file created
- [ ] Frontend deployed on Vercel
- [ ] `NEXT_PUBLIC_BACKEND_URL` set on Vercel
- [ ] `FRONTEND_URL` updated on Render backend
- [ ] Test account creation works
- [ ] Test OTP verification works
- [ ] Test login works
- [ ] Test all features (Dashboard, Budget, Advisors)
- [ ] Test on mobile device
- [ ] Share your app! 🎉

---

## 📞 Get Help

If you run into issues:

1. **Check Logs**:
   - Render: Dashboard → Logs
   - Vercel: Deployment → Function Logs
   
2. **Common Issues**:
   - MongoDB connection: Check password, IP whitelist
   - CORS: Check FRONTEND_URL matches Vercel URL
   - Build fails: Check requirements.txt versions

3. **Test Locally First**:
   ```bash
   # Backend
   cd backend
   uvicorn main:app --reload
   
   # Frontend
   cd frontend
   npm run dev
   ```

---

**Your app is ready to deploy! Follow steps 1-6 above.** 🚀

Good luck! 🎉
