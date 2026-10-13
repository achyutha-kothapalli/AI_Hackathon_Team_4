# Letter Lens

Photograph a German letter → get a translation, a plain-language summary, the
deadlines, amounts and reference numbers that matter, **and see exactly where
each one is printed on your photo**. Deadlines export to your calendar.

- **backend/** — FastAPI (Python). Calls Claude and returns structured JSON.
- **frontend/** — React + Vite (TypeScript). Upload, overlay viewer, insights.

The two folders share nothing but the HTTP API. Import the repo into Vercel
as-is and both deploy together; or deploy them as two separate projects.
**How it works, end to end: [HOW_IT_WORKS.md](HOW_IT_WORKS.md).**

```
Hackathon_WHU/
├── backend/            Python only — run, test and deploy from here
│   ├── app/            FastAPI application (routes, services, analyzers, profiles, schemas)
│   ├── api/index.py    Vercel entry point
│   ├── tests/
│   ├── scripts/        make_sample.py (regenerates the sample letter + fixture)
│   ├── requirements.txt, requirements-dev.txt, pytest.ini
│   ├── vercel.json, .vercelignore   Vercel project config (Root Directory = this folder)
│   └── .env.example
├── frontend/           Node only — run, build and deploy from here
│   ├── src/            api/, features/{upload,ocr,viewer,insights,calendar,analysis}, lib/
│   ├── public/sample/  sample letter for "Try a sample"
│   ├── package.json, vite.config.ts, tsconfig.json
│   ├── vercel.json, .vercelignore   Vercel project config (Root Directory = this folder)
│   └── .env.example
├── api/index.py        ┐ one-project Vercel deploy: thin shim that imports backend/app,
├── vercel.json         │ builds frontend/ and routes /api/* to the backend
├── requirements.txt    │ (copy of backend/requirements.txt — a test keeps them in sync)
├── .vercelignore       ┘
├── HOW_IT_WORKS.md
└── README.md
```

## Run locally

Prereqs: Python 3.12+, Node 20+. Two terminals.

**Backend** (http://localhost:8000, API docs at `/api/docs`):

```bash
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements-dev.txt      # macOS/Linux: .venv/bin/pip
cp .env.example .env                                    # add ANTHROPIC_API_KEY (optional)
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000 --env-file .env
```

**Frontend** (http://localhost:5173):

```bash
cd frontend
npm install
npm run dev
```

In development, Vite forwards `/api/*` to the backend on port 8000, so no
configuration is needed. Without an API key the backend runs in **mock mode**
and returns the analysis of the sample letter, so the frontend can be built
without keys or credits. Click "Try a sample fine notice".

**Tests:** `cd backend && .venv/Scripts/python -m pytest` (no key needed).
**Type-check + build:** `cd frontend && npm run build`.

## Deploy to Vercel

### Option A — one project, straight from the repo (recommended for the hackathon)

1. Push the repo to GitHub.
2. In Vercel: **Add New → Project → Import** the repo. Leave Root Directory as the repo root;
   the root `vercel.json` already sets the build. Don't change the framework preset.
3. Add environment variable `ANTHROPIC_API_KEY` (without it the site runs in demo mode).
4. Deploy. The site and the API share one domain (`https://<name>.vercel.app` and
   `https://<name>.vercel.app/api/...`), so `VITE_API_URL` and `CORS_ORIGINS` aren't needed.

Every push to `main` redeploys; every pull request gets its own preview URL.

### Option B — two projects (frontend and backend deployed and scaled separately)

1. Push the repo to GitHub.
2. **Backend project:** Import the repo in Vercel and set **Root Directory = `backend`**.
   Add environment variables `ANTHROPIC_API_KEY` and `CORS_ORIGINS` (the frontend's
   URL, e.g. `https://letter-lens.vercel.app`). Deploy and note its URL.
3. **Frontend project:** Import the same repo again with **Root Directory = `frontend`**.
   Add `VITE_API_URL` = the backend URL from step 2. Deploy.
4. If the frontend URL changed, update `CORS_ORIGINS` on the backend and redeploy it.

## Team split (5 people)

1. **AI & prompts** — `backend/app/profiles/`, `backend/app/analyzers/prompts.py`
2. **Backend & API** — `backend/app/api/`, `backend/app/services/`, tests
3. **Document viewer** — `frontend/src/features/viewer`, `frontend/src/features/ocr`
4. **Insights UX** — `frontend/src/features/insights`, `frontend/src/features/calendar`
5. **Upload, infra & demo** — `frontend/src/features/upload`, Vercel, the pitch flow

Everyone except person 1 can work in mock mode.
