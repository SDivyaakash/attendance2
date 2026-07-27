# RollCall — QR + Location Attendance

A web app for taking classroom attendance by QR code, with oversight built
in all the way up to the principal's office. Each teacher runs a session per
class; the QR code **rotates every 12 seconds** and each scan is **checked
against the classroom's GPS location**, so a screenshot or a code shared
from outside the room won't mark anyone present. Anyone not scanned in by
the time the teacher ends the session is automatically marked absent.

## Roles

- **Student** — enrolls in subjects with a join code, scans the QR each class.
- **Teacher** — creates subjects, runs sessions, sees live attendance and
  per-subject reports for their own classes.
- **HOD** — oversight of every subject and teacher **within their own
  department only**: student counts, session counts, and attendance
  percentages, with CSV export. Can also open any session's roster to add or
  correct a student's attendance (e.g. a scan that failed to go through) —
  every manual change is logged with the HOD's name for accountability.
- **Principal** — the same oversight, but **college-wide across every
  department**, plus the ability to add new departments as the college grows.

Departments are shared across the whole college (seeded with a common set —
CSE, IT, ECE, EEE, Mechanical, Civil, MBA, MCA — extendable by any principal).
Teachers and HODs pick their department at signup; a subject's department is
inherited from the teacher who creates it, which is what scopes HOD access.

## How it works

1. A teacher creates a **subject** and gets a join code to share with students.
2. Students enter the join code once to enroll.
3. When class starts, the teacher stands in the room, taps **"Use my current
   location"**, sets an allowed radius (e.g. 40m) — or disables the location
   check entirely for that session if GPS is unreliable in that room — and
   starts the session. This displays a QR code that automatically refreshes
   every 12 seconds.
4. Students open the app (or just scan with their phone's normal camera —
   the QR encodes a link) and tap **"Scan attendance QR"**. The app grabs
   their GPS location and sends it with the scanned code.
5. The server marks them **present** only if:
   - the QR token is still within its rotation window (not stale/replayed),
   - their device's location is within the allowed radius of the classroom
     (skipped entirely if the teacher disabled location checking),
   - they're enrolled in the subject, and
   - they haven't already been marked for that session.
6. When the teacher ends the session, everyone enrolled who didn't scan in
   is automatically marked **absent**.
7. Teachers, HODs, and principals can each pull an attendance report
   (percentage per student, downloadable as CSV) scoped to what they're
   allowed to see — one subject, one department, or the whole college.

## Tech stack

- **Backend**: Node.js + Express, SQLite (via `better-sqlite3`), JWT auth
- **Frontend**: React (Vite), Tailwind CSS, `qrcode.react` (QR generation),
  `html5-qrcode` (in-app camera scanning)

## Running it locally

You'll need [Node.js](https://nodejs.org) 18+ installed.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # optionally edit JWT_SECRET
npm start
```

This runs the API on `http://localhost:4000` and creates a local
`attendance.db` SQLite file (created automatically, no separate DB setup
needed).

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

This runs the app on `http://localhost:5173` and proxies API calls to the
backend automatically (see `vite.config.js`).

Open `http://localhost:5173` in your browser, sign up as a **teacher** in one
browser/tab and a **student** in another (or use incognito for the second),
and try the flow.

### Testing the location check locally

Since you'll likely be testing from one laptop, your browser's geolocation
for both the "teacher" tab and "student" tab will report roughly the same
real-world location — so attendance should mark as present. To test the
*rejection* path, you can spoof your browser's location in DevTools
(Chrome: DevTools → ⋮ → More tools → Sensors → Location) to a location far
from where you started the session.

## Deploying to Render — both services at once (Blueprint)

This repo includes a `render.yaml` at its root, which is a **Render
Blueprint**: a single file that describes both the backend and frontend
services together and wires them up automatically (each one's public URL
is injected into the other, so you don't need to copy/paste URLs between
dashboards).

1. Push this repo to GitHub (see below if you haven't already).
2. Go to [dashboard.render.com](https://dashboard.render.com) → **New +** → **Blueprint**.
3. Connect your GitHub account if you haven't, then select this repo.
4. Render detects `render.yaml` and shows a preview of the two services
   (`rollcall-backend` and `rollcall-frontend`). Give the Blueprint a name
   and click **Apply**.
5. Render builds and deploys both services. This takes a few minutes the
   first time. When it's done, open the `rollcall-frontend` service's URL
   — that's your live app.

That's it — no manual env var copying required, since `render.yaml` wires
`CORS_ORIGIN`/`FRONTEND_HOST` and `VITE_API_URL`/`BACKEND_HOST` between the
two services for you.

**Persistent database:** the free plan's disk is wiped on every redeploy,
which would reset the SQLite database. To persist data across deploys:
- Upgrade the `rollcall-backend` service to a paid instance type
- Add a **Disk** to it (mount path `/data`, 1GB is plenty)
- Add an environment variable `DB_PATH` = `/data/attendance.db` on that
  service (Dashboard → your backend service → Environment)

**Updating later:** any time you `git push` to the connected branch, Render
auto-redeploys both services from the same Blueprint.

### Pushing this repo to GitHub (if you haven't yet)

```bash
cd attendance-app
git init
git add .
git commit -m "Initial commit"
```
Create an empty repo at [github.com/new](https://github.com/new) (no README/gitignore), then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

## Deploying for real use

For actual classroom use you'll want to:

- Host the backend somewhere persistent (Render, Railway, Fly.io, a college
  server, etc.) and point the frontend's API calls at that URL instead of
  the local proxy.
- Serve the frontend as a static build (`npm run build` in `frontend/`,
  then deploy the `dist/` folder — e.g. Vercel, Netlify, or the same host
  as the backend).
- Use HTTPS in production — browsers require a secure origin for
  geolocation and camera access outside of `localhost`.
- Swap the SQLite file for a hosted Postgres/MySQL database if you expect
  concurrent writes at scale (SQLite is fine for a single class/department;
  for a whole college with many simultaneous sessions, a real DB server is
  safer).
- Set a strong, random `JWT_SECRET` in `backend/.env`.

## Project structure

```
attendance-app/
  backend/
    src/
      server.js          Express app entry point
      db.js               SQLite schema + connection
      middleware/auth.js  JWT auth + role guard
      utils/qr.js         Rotating token generation/verification
      utils/geo.js        Haversine distance calculation
      routes/auth.js      Signup / login
      routes/teacher.js   Subjects, sessions, QR token, live view, reports
      routes/student.js   Enroll, mark attendance, attendance history
  frontend/
    src/
      pages/              One file per screen (teacher + student flows)
      components/         Shared Layout, ProtectedRoute, QrScanner
      AuthContext.jsx      Logged-in user state
      api.js               Axios client with auth header
```

## Notes on the anti-cheating design

- **Rotating QR** defeats the classic "student photographs the QR and
  sends it to a friend at home" trick — by the time the photo is shared,
  the code is likely expired.
- **Geolocation radius check** defeats the "I have the current code but
  I'm not actually there" case — even a fresh, valid code is rejected if
  the scanning device isn't near the classroom's stored coordinates.
- Neither check is unbeatable on its own (GPS can be spoofed by a
  determined user, and radius must be set loosely enough to tolerate normal
  GPS drift indoors), but together they raise the effort required well
  beyond casual proxy attendance. If your college needs stronger
  guarantees, consider pairing this with instructor spot-checks.
