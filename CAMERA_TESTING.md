# Camera Scanning Testing Guide

This guide covers how to test the QR camera scanner in different environments.

## Prerequisites

Camera access requires a **secure context**:
- `localhost` (any port)
- `127.0.0.1`
- HTTPS connections
- ngrok/localtunnel HTTPS URLs

**HTTP on non-localhost will NOT work for camera access!**

---

## Quick Start Options

### Option 1: Local Development (localhost)

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

Open: `http://localhost:3000`

Camera will work because localhost is a secure context.

---

### Option 2: HTTPS Development (for testing on same machine)

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend with HTTPS
cd frontend
npm run dev:https
```

Open: `https://localhost:3000`

Accept the self-signed certificate warning.

---

### Option 3: LAN Testing (access from phone on same WiFi)

**Step 1: Find your computer's IP**
```bash
# Windows
ipconfig

# Mac/Linux
ifconfig | grep "inet "
```

Look for an IP like `192.168.1.xxx`

**Step 2: Start both servers**
```bash
# Backend (already binds to 0.0.0.0)
cd backend
npm run dev

# Frontend (binds to 0.0.0.0)
cd frontend
npm run dev
```

**Step 3: Update frontend environment**
Edit `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://YOUR_IP:5000/api
```

**Step 4: Access from phone**
- Open `http://YOUR_IP:3000` on your phone
- ⚠️ Camera will NOT work (HTTP on non-localhost)
- Use manual ticket entry

---

### Option 4: ngrok Tunnel (RECOMMENDED for mobile testing)

**Step 1: Install ngrok**
```bash
# npm
npm install -g ngrok

# Or download from https://ngrok.com/download
```

**Step 2: Start backend tunnel**
```bash
# Terminal 1 - Start backend
cd backend
npm run dev

# Terminal 2 - Tunnel backend
ngrok http 5000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

**Step 3: Update frontend environment**
Edit `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=https://abc123.ngrok.io/api
```

**Step 4: Start frontend tunnel**
```bash
# Terminal 3 - Start frontend
cd frontend
npm run dev

# Terminal 4 - Tunnel frontend
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://xyz789.ngrok.io`)

**Step 5: Test on phone**
Open `https://xyz789.ngrok.io` on your phone.

Camera WILL work because it's HTTPS!

---

## Troubleshooting

### "HTTPS Required" Error
- You're accessing via HTTP on a non-localhost URL
- Use `localhost`, ngrok HTTPS, or enable HTTPS on dev server

### "Camera Permission Denied"
1. Check browser settings
2. Look for camera icon in address bar
3. Reset permissions and refresh

### "No Camera Found"
- Device has no camera
- Camera is disabled in system settings
- Another app is using the camera

### "Camera In Use"
- Close other apps using camera (Zoom, Teams, etc.)
- Close other browser tabs using camera

### Scanner starts but doesn't scan
- Ensure QR code is well-lit
- Hold camera 6-12 inches from code
- Keep camera steady

### ngrok connection refused
- Make sure backend/frontend is running BEFORE starting ngrok
- Check if firewall is blocking connections

---

## Complete Dev Setup Script

```bash
# === Setup ===
# Clone and install (if not done)
git clone <repo>
cd unievent
cd backend && npm install
cd ../frontend && npm install

# === Start Everything ===

# Terminal 1: Backend
cd backend
npm run dev
# Output: http://localhost:5000

# Terminal 2: ngrok backend
ngrok http 5000
# Copy HTTPS URL

# Terminal 3: Update frontend env and start
cd frontend
# Edit .env.local with ngrok URL
npm run dev
# Output: http://localhost:3000

# Terminal 4: ngrok frontend (optional, for phone testing)
ngrok http 3000
# Open this HTTPS URL on phone
```

---

## Environment Variables Summary

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Backend (.env)
```
PORT=5000
HOST=0.0.0.0
MONGODB_URI=mongodb://...
JWT_SECRET=...
```

---

## Testing Checklist

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Can login/signup
- [ ] Can create events (as organizer)
- [ ] Can register for events (as student)
- [ ] Can open QR scan modal
- [ ] Camera permission prompt appears
- [ ] Camera feed shows in scanner
- [ ] Can scan a valid QR code
- [ ] Verification result displays correctly
- [ ] Manual ticket ID entry works
