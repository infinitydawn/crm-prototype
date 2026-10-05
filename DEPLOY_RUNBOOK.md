# CRM Prototype — Deploy Runbook (Vercel + Render + Neon)

Repo: github.com/infinitydawn/crm-prototype
Everything below is web-dashboard work — you can do it from any device. No SSH needed.

Order matters: **Neon (DB) → Render (backend) → Vercel (frontend)**.

---

## 1. Neon — create the Postgres database
1. Sign up at neon.tech (top right, "Sign up"). Free tier is fine.
2. In the console: **New project** → name it `crm`, region nearest you (e.g. US East) → Create.
3. Copy the **connection string** — it looks like:
   `postgresql://neondb_owner:xxxx@ep-...aws.neon.tech/neondb?sslmode=require`
   Keep this; you'll paste it into Render next. Edit > connection string; pick "Node.js/Postgres".

## 2. Render — create the backend (web service)
1. Sign up at render.com (Google/GitHub login; start free).
2. **New** → **Web Service** → connect your GitHub account → pick `infinitydawn/crm-prototype`.
   (Render reads the committed `render.yaml` blueprint automatically.)
3. Confirm/override settings:
   - **Service name:** `crm-backend`
   - **Build Command:** `cd server && npm install`
   - **Start Command:** `cd server && node index.js`
   - **Instance type:** Free (spins down when idle — cold start on first request is normal)
4. **Environment → Add Environment Variable**:
   - `DATABASE_URL` = the **Neon** connection string from step 1
   - `CORS_ORIGIN` = (leave blank for now; we'll set your Vercel URL in step 3. You can edit this later — for testing, leave blank to allow all origins.)
5. **Create Web Service.** Wait ~1-2 min for first deploy.
6. **Verify:** visit `https://<your-backend>.onrender.com/api/boards` — should return JSON (an empty `[]` at first). If it errors, check the **Logs** tab; if `waitForDb` fails it means `DATABASE_URL` is wrong or the schema isn't loaded (step 4 below).

## 3. Vercel — create the frontend
1. Sign up at vercel.com (GitHub login is fastest).
2. **Add New Project** → import `infinitydawn/crm-prototype`.
3. Vercel auto-detects the Vite framework and reads `vercel.json` (`rootDirectory: client`).
4. **Environment Variables** (Settings → Environment Variables, or at import time):
   - `VITE_API_URL` = `https://<your-backend>.onrender.com`   ← your Render URL, no trailing slash
   - Check the **Production** scope is set.
5. **Deploy.** After it builds, your app is live at `https://<your-app>.vercel.app`.
6. **Fix CORS:** go back to Render → Environment → set `CORS_ORIGIN` = `https://<your-app>.vercel.app` → **Deploy / Restart** the Render service.
   This tells the backend to accept requests from your exact frontend domain.

## 4. Load the schema into Neon
The tables don't exist on Neon until you create them. Two options:
- **Easiest (GUI):** Neon console → your database → **SQL Editor** → paste the contents of `db/schema.sql` → Run.
- **Via your local box (needs psql or the app):** `docker exec -i crm_postgres psql -U crm -d crm < db/schema.sql` — but that targets the LOCAL docker DB, not Neon. The Neon SQL Editor is the correct place for the cloud DB.

⚠️ Note: `schema.sql` has `DROP TABLE IF EXISTS` at the top — safe to run once (it seeds Product Roadmap + Customer Pipeline), but re-running kills any data you've added. For a live app you'd add a migration system; this prototype just runs the seed.

## 5. Verify end-to-end
- Frontend: `https://<your-app>.vercel.app` → should show the 2 seed boards.
- Create a board, add a row, edit a cell → reload → data persists (stored in Neon).

---

## Test status so far (local, verified)
- Backend + frontend run locally, app serving at :5173, all CRUD passing.
- GitHub Actions CI passes on every push.
- Local Postgres (Docker) has the 2 seed boards.

## Gotchas
- **Free Render spins down** after ~15 min idle → first visit after idle takes ~30-60s to wake. Not a bug.
- **Neon free** pauses after 5 min inactivity too — similar cold-start behavior.
- Vercel free = good for a static React app like this.
- If `/api/boards` shows network error on Vercel: CORS misconfig → recheck `CORS_ORIGIN` on Render + that `VITE_API_URL` is set and triggers a redeploy.
