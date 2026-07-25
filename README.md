# 1% — Identity Rebuild

A dark, quiet dashboard for the morning identity ritual and habit tracking.
Node.js + Express backend, MongoDB Atlas for storage, plain HTML/CSS/JS frontend (no build step).

## What's included (v1)

- **Morning Ritual** — full-screen, 3-act guided routine (Past / Present / Future) with line-by-line reveal and spoken narration (uses your browser's built-in voice, no audio files needed).
- **Habit tracker** — add "good" habits (build a streak) or "bad" habits (days clean since last slip), mark daily, milestone celebrations at 3/7/14/21/30/45/60/90/120/180/365 days.
- **Good Night check-in** — quick end-of-day log.

## 1. Set up MongoDB Atlas (free)

1. Go to https://www.mongodb.com/cloud/atlas/register and create a free account.
2. Create a free (M0) cluster.
3. Under **Database Access**, add a database user with a username/password.
4. Under **Network Access**, add your current IP (or `0.0.0.0/0` for "allow from anywhere" while testing locally).
5. Click **Connect → Drivers**, copy the connection string. It looks like:
   `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority`

## 2. Configure the app

```bash
cd backend
cp .env.example .env
```

Open `.env` and paste your connection string into `MONGODB_URI`, filling in your username/password and adding a database name (e.g. `onepercent`) before the `?`:

```
MONGODB_URI=mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/onepercent?retryWrites=true&w=majority
```

## 3. Install & run

```bash
npm install
npm start
```

Open **http://localhost:3000** in your browser.

For auto-restart on file changes during development:
```bash
npm run dev
```

## Project structure

```
backend/
  server.js              Express app entry point
  models/
    Habit.js              habit schema + streak calculation
    RoutineLog.js          daily morning/night log schema
  routes/
    habits.js              habit CRUD + mark/undo endpoints
    routine.js              morning completion + night check-in + streak
  public/
    index.html              app shell
    style.css                design system (dark, brass/sage/rust palette)
    app.js                    frontend logic, ritual player, fetch calls
    ritual-content.js          the 3-minute identity script text
```

## Notes

- No login/auth — this is built for single-user local use, per your setup.
- All data lives in your own MongoDB Atlas cluster. Nothing is sent anywhere else.
- The narration uses the Web Speech API built into your browser (Chrome/Edge have the best voice quality). You can mute your system volume and just read the text if you prefer — the ritual still auto-advances.
- Not implemented in v1 (can be added next): the temptation-surf timer, Allen Carr–style guided meditation, and good/bad habit push notifications.

## Extending it

- **Temptation timer**: a new route `/api/temptation/start` + `/api/temptation/resolve`, and a countdown UI reusing the ritual overlay pattern, would drop in cleanly.
- **Reminders**: since there's no server always running, browser `Notification` API + a service worker would be the simplest way to nudge yourself for the ritual/check-in without adding a phone app.
