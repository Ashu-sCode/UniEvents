# CORS Troubleshooting Guide

## Quick Fix Checklist

If you're getting CORS errors, follow these steps:

### 1. ✅ Check Backend is Running

```bash
cd backend
npm run dev
```

You should see:
```
🚀 UniEvent API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Environment: development
🌐 Local:       http://localhost:5000/api
🌐 Network:     http://192.168.x.x:5000/api
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2. ✅ Check Frontend Environment

Open `frontend/.env.local` and verify:
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**IMPORTANT:**
- Must end with `/api`
- No trailing slash after `/api`
- For ngrok: `https://your-id.ngrok-free.app/api`

### 3. ✅ Restart Frontend

```bash
cd frontend
npm run dev
```

Open browser console and look for:
```
API URL: http://localhost:5000/api
```

### 4. ✅ Clear Browser Cache

- Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
- Clear cached images and files
- Close all browser tabs
- Restart browser

### 5. ✅ Test API Directly

Open a new terminal and test the API:

```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Should return:
# {"success":true,"message":"UniEvent API is running"}
```

---

## Common Issues

### Issue 1: "No 'Access-Control-Allow-Origin' header"

**Cause:** Backend CORS not configured or backend not running

**Fix:**
1. Ensure backend is running
2. Check `backend/src/app.js` has CORS middleware
3. Restart backend server

### Issue 2: "ERR_CONNECTION_REFUSED"

**Cause:** Backend server not running or wrong port

**Fix:**
```bash
cd backend
npm run dev
```

Check port 5000 is not in use:
```bash
# Windows
netstat -ano | findstr :5000

# Mac/Linux
lsof -i :5000
```

### Issue 3: Wrong API URL in Frontend

**Cause:** `.env.local` not configured correctly

**Fix:**
```bash
cd frontend
```

Edit `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Restart frontend:
```bash
npm run dev
```

### Issue 4: API URL has trailing slash

**Wrong:**
```
NEXT_PUBLIC_API_URL=http://localhost:5000/
NEXT_PUBLIC_API_URL=http://localhost:5000/api/
```

**Correct:**
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Issue 5: Using ngrok without proper setup

**Problem:** Frontend at `localhost:3000` calling ngrok URL `https://xxx.ngrok-free.app`

**Solution 1 - Use localhost (RECOMMENDED):**
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**Solution 2 - Use ngrok for both:**
1. Tunnel backend: `ngrok http 5000`
2. Tunnel frontend: `ngrok http 3000`
3. Update `.env.local` with backend ngrok URL
4. Open frontend ngrok URL in browser

---

## Testing CORS

### Test 1: Direct API Call

```bash
curl -v http://localhost:5000/api/health
```

Look for:
```
< Access-Control-Allow-Origin: *
< Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
```

### Test 2: Preflight Request

```bash
curl -v -X OPTIONS http://localhost:5000/api/auth/login \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST"
```

Should return 200 OK with CORS headers.

### Test 3: Browser Console

Open browser DevTools (F12), go to Console tab:

```javascript
fetch('http://localhost:5000/api/health')
  .then(r => r.json())
  .then(d => console.log(d))
```

Should see: `{success: true, message: "UniEvent API is running"}`

---

## Complete Fresh Start

If nothing works, do a complete reset:

```bash
# 1. Stop all servers (Ctrl+C in all terminals)

# 2. Backend
cd backend
rm -rf node_modules
npm install
npm run dev

# 3. Frontend (new terminal)
cd frontend
rm -rf node_modules .next
npm install
```

Check `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Start frontend:
```bash
npm run dev
```

---

## Environment Files Summary

### Backend `.env`
```
PORT=5000
HOST=0.0.0.0
NODE_ENV=development
MONGODB_URI=mongodb://...
JWT_SECRET=your-secret
JWT_EXPIRES_IN=7d
```

### Frontend `.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## Still Not Working?

1. Check firewall isn't blocking port 5000
2. Try different port (change PORT in backend `.env`)
3. Disable browser extensions (especially ad blockers)
4. Try incognito/private window
5. Try different browser

---

## Quick Reference: Correct Setup

```bash
# Terminal 1: Backend
cd backend
npm run dev
# ✅ Should show: http://localhost:5000/api

# Terminal 2: Frontend
cd frontend
# Verify .env.local has: NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm run dev
# ✅ Should show: http://localhost:3000

# Browser
# Open: http://localhost:3000
# Open DevTools Console
# Should see: "API URL: http://localhost:5000/api"
```
