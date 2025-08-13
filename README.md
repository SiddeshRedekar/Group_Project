# Fitness Tracker — VERIFIED (Express + SQLite + Vanilla JS)

A ready-to-run full-stack project with a polished UI and reliable API routes.

## Stack
- **Frontend:** HTML, CSS, Vanilla JavaScript
- **Backend:** Node.js (Express)
- **Database:** SQLite (file `fitness.db` auto-created)

## Folder Layout
```
fitness-tracker-verified/
├─ public/
│  ├─ index.html
│  ├─ styles.css
│  └─ app.js
├─ server.js
├─ package.json
└─ fitness.db   (auto-created at first run)
```

## Quick Start
1. Install Node.js (LTS recommended).
2. Open a terminal in the project folder.
3. Install deps:
   ```bash
   npm install
   ```
4. Start:
   ```bash
   npm start
   ```
5. Open **http://localhost:3000** in your browser.
6. Click **“Check API Health”** in the header — it should show **OK** and your port.

> ✅ Do **not** double-click `index.html`. Always go via **http://localhost:3000**.

## Features
- Add / edit / delete workouts
- Filter by type and date range
- Live totals (workouts, minutes, calories)
- “Last 7 Days” bar chart (no libraries)
- API health check + request logging in terminal
- Seeds a couple of rows on first run so you can see data immediately

## API (Base: `/api`)
- `GET /health` → `{ ok: true }`
- `GET /workouts?type=Running&from=YYYY-MM-DD&to=YYYY-MM-DD`
- `POST /workouts` → JSON `{ date, type, duration, calories?, notes? }`
- `PUT /workouts/:id`
- `DELETE /workouts/:id`
- `GET /stats` → totals + byType + last7 days

## Common Issues & Fixes
- **“Failed to fetch”** → Server not running or opened as `file://`. Run `npm start` and use `http://localhost:3000`.
- **“API route not found”** → Wrong path. In the UI, click **Check API Health**. Terminal logs each request.
- **Port in use** → Run on another port:
  ```bash
  # Windows (cmd)
  set PORT=4000 && npm start
  # PowerShell
  $env:PORT=4000; npm start
  # macOS/Linux
  PORT=4000 npm start
  ```
  Then browse to `http://localhost:4000`.

## MySQL (Optional)
If your college requires MySQL, I can provide a MySQL-ready `server.js` using `mysql2/promise` with the exact same routes.
