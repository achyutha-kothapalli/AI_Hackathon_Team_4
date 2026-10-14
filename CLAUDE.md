# CLAUDE.md

BriefVerstehen: photograph an official letter → translation, key facts
(deadlines, amounts, references) highlighted on the photo, and an accuracy &
safety harness. FastAPI backend (`backend/`) + React/Vite frontend (`frontend/`),
deployed on Vercel. Read HOW_IT_WORKS.md section 2 for the architecture and file map.

## Commands (Windows paths; use `.venv/bin/` on macOS/Linux)

```bash
# backend/  (run from the backend folder)
.venv/Scripts/python -m pytest -q                     # 42 tests, no API keys needed
.venv/Scripts/python -m ruff check . && .venv/Scripts/python -m ruff format --check .
.venv/Scripts/python -m evaluation.benchmark          # harness gate: must stay 71/71, 0 false alarms
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000 --env-file .env
.venv/Scripts/python scripts/make_samples.py          # regenerate sample letters + exact answers

# frontend/
npm run build                                         # type-check + build
npm run dev                                           # http://localhost:5173, proxies /api to :8000
```

Demo mode: without `ANTHROPIC_API_KEY` / `TRUSTEDTOKENS_API_KEY` (or with
`ANALYZER=mock`) the backend returns the domain pack's sample answers. Use it for
all UI work; real AI calls cost money.

## Where things go

| Change | Location |
|---|---|
| New use case / hackathon problem | Copy `backend/app/domains/german_letter/`, register in `domains/__init__.py` |
| New accuracy/safety rule | The domain's `rules.json` (no code) |
| New document class, legal basis, help link | The domain's `ontology.json` |
| New harness check | `backend/app/harness/checks/<name>.py` + `DEFAULT_CHECKS` |
| New AI provider | `backend/app/analyzers/<name>.py` + `create_analyzer()` |
| New analysis field | `backend/app/schemas/analysis.py` AND `frontend/src/api/types.ts` |
| UI wording for a use case | The domain's `ui` in `domains/<id>/__init__.py` (served via `/api/meta`) |
| New UI feature | `frontend/src/features/<name>/`; state lives in `features/analysis/useAnalysis.ts` |

Step-by-step recipes: CONTRIBUTING.md.

## Rules

- Keep domain knowledge (German terms, legal rules, wording) inside `backend/app/domains/<id>/` only.
- Imports point downwards: `api → services → (analyzers, harness, domains) → knowledge → schemas → core`.
- Backend contracts (`schemas/analysis.py`, `harness.py`, `api.py`) and `frontend/src/api/types.ts` must match.
- Harness checks only report findings; they never modify the AI's answer.
- User-facing errors: raise `AppError(message, status)` (`app/core/errors.py`).
- Never log images or letter text; never commit `.env`.
- After backend changes run pytest, ruff and the benchmark; after frontend changes run `npm run build`.
- Python 3.12+, Ruff line length 110. TypeScript strict mode.
