# BriefVerstehen

[![CI](https://github.com/achyutha-kothapalli/AI_Hackathon_Team_4/actions/workflows/ci.yml/badge.svg)](https://github.com/achyutha-kothapalli/AI_Hackathon_Team_4/actions/workflows/ci.yml)
![Python 3.12+](https://img.shields.io/badge/python-3.12%2B-blue)
![Harness benchmark 154/154](https://img.shields.io/badge/harness%20benchmark-154%2F154%20faults%20caught-brightgreen)

**Hackathon problem:** make medical information (diagnoses, discharge notes,
medication plans) understandable and actionable for people with low health
literacy, visual impairment or poor eyesight, in line with the DSGVO.

Photograph a discharge letter or medication plan → get a **plain-language
explanation** (also in *Einfache Sprache*), a **daily medicine plan**, warning
signs and next steps, **read aloud** if you like, with every fact and dose
**verified against the document** and highlighted on your photo. Health data is
only processed with **explicit consent**. The original use case (German official
letters) remains available as a second domain pack.

- **backend/** — FastAPI (Python). Calls Claude or TrustedTokens (EU-hosted models) and returns structured JSON.
- **frontend/** — React + Vite (TypeScript). Upload, overlay viewer, insights, safety checks.
- **Accuracy & safety harness** — every AI answer is checked in code against a
  networkx knowledge graph (JSON ontology + rules): nothing invented, nothing
  lost, no medical advice beyond the document, readability, scam and
  prompt-injection safeguards. Fault-injection benchmark: 154/154 corruptions
  caught, 0 false alarms. See [HOW_IT_WORKS.md section 10](HOW_IT_WORKS.md#10-accuracy--safety-harness).
- **Domain packs** — everything specific to a use case (prompt, wording, samples,
  ontology, rules) lives in one folder, so a new problem is a new folder, not a rewrite.

| Document | What it covers |
|---|---|
| [HOW_IT_WORKS.md](HOW_IT_WORKS.md) | Architecture (C4 diagrams, file map), request flow, contracts, harness, deployment |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Workflow, quality gates, recipes: new domain, rule, check, AI provider |
| [docs/adr/](docs/adr/) | Architecture decision records: why it is built this way |
| [PRIVACY.md](PRIVACY.md) | Data flow: what is sent where, and what is kept (nothing) |
| [CLAUDE.md](CLAUDE.md) | Conventions and commands for Claude Code |

```
Hackathon_WHU/
├── backend/                 Python 3.12 · FastAPI
│   ├── app/
│   │   ├── core/            config, errors, logging + request ids
│   │   ├── api/             HTTP routes, typed responses
│   │   ├── services/        orchestration: validate → analyze → sanitise → harness
│   │   ├── analyzers/       AI providers: Claude, TrustedTokens, mock (demo mode)
│   │   ├── domains/         ★ domain packs: medical_document/ (default), german_letter/
│   │   ├── knowledge/       knowledge-graph engine (networkx)
│   │   ├── harness/         accuracy & safety check pipeline + checks/
│   │   └── schemas/         contracts: AI output, harness report, API responses
│   ├── tests/               51 tests, no API keys needed
│   ├── evaluation/          fault-injection benchmark, real-model evaluation, cases/
│   ├── scripts/             make_samples.py (sample letters with exact ground truth)
│   ├── api/index.py         Vercel entry point (backend-only deploy)
│   └── pyproject.toml, requirements*.txt, vercel.json, .env.example
├── frontend/                React 19 · TypeScript · Vite
│   ├── src/                 api/, config/, components/, features/{analysis,upload,ocr,viewer,insights,medication,safety,accessibility,calendar}, lib/
│   └── public/sample/       sample letters for "Try a sample"
├── docs/adr/                architecture decision records
├── .github/workflows/ci.yml lint, tests, benchmark, frontend build
├── api/index.py, vercel.json, requirements.txt   one-project Vercel deploy from the repo root
└── README.md, HOW_IT_WORKS.md, CONTRIBUTING.md, PRIVACY.md, CLAUDE.md
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
configuration is needed. Without an API key the backend runs in **demo mode**
and returns prepared answers for the sample letters, so the frontend can be
built without keys or credits. Click one of the "Try a sample" buttons.

## Quality gates

All of these run in CI on every pull request ([CONTRIBUTING.md](CONTRIBUTING.md)):

```bash
cd backend && .venv/Scripts/python -m ruff check . && .venv/Scripts/python -m pytest && .venv/Scripts/python -m evaluation.benchmark
```

```bash
cd frontend && npm run build
```

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
   URL, e.g. `https://briefverstehen.vercel.app`). Deploy and note its URL.
3. **Frontend project:** Import the same repo again with **Root Directory = `frontend`**.
   Add `VITE_API_URL` = the backend URL from step 2. Deploy.
4. If the frontend URL changed, update `CORS_ORIGINS` on the backend and redeploy it.
