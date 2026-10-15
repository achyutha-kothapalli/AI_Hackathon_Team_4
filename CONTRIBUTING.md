# Contributing

How to work on BriefVerstehen as a team. Architecture and the role of every
file: [HOW_IT_WORKS.md, section 2](HOW_IT_WORKS.md#2-architecture). Design
decisions: [docs/adr/](docs/adr/).

## Setup

```bash
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements-dev.txt     # macOS/Linux: .venv/bin/pip
cp .env.example .env                                   # keys are optional (demo mode without)
```

```bash
cd frontend
npm install
```

Run: `uvicorn app.main:app --reload --port 8000 --env-file .env` in `backend/`, and
`npm run dev` in `frontend/` (http://localhost:5173). Without API keys the backend
runs in **demo mode** and returns the sample answers, so most work needs no key.

## Workflow

1. Branch from `develop`: `feature/<short-name>`, `fix/<short-name>` or `refactor/<short-name>`.
2. Keep pull requests small and focused; one topic per PR.
3. Before pushing, run the quality gates below. CI runs the same gates on every PR.
4. Merge into `develop` via pull request; `main` is what gets deployed.

## Quality gates

| Check | Command | Where |
|---|---|---|
| Lint + format | `ruff check . && ruff format --check .` (`ruff format .` fixes it) | `backend/` |
| Tests | `pytest` | `backend/` |
| Harness benchmark | `python -m evaluation.benchmark` (must stay 100 %, 0 false alarms) | `backend/` |
| Type-check + build | `npm run build` | `frontend/` |

## Recipes

### Solve a new problem: add a domain pack

1. Copy `backend/app/domains/german_letter/` to `backend/app/domains/<new_id>/`.
2. Edit `<new_id>/__init__.py`: `id`, `name`, `description`, the prompt
   `instructions` (what to look for), `ui` wording, `target_languages`,
   `source_language` / `ocr_language` (Tesseract code, e.g. `eng`, `fra`) and `samples`.
3. Edit `ontology.json`: document classes and their `parents`, keywords,
   legal bases and help resources. Keep the root class (`official_letter` or your own).
4. Edit `rules.json`: start with a few `requires_item` and `signal_coverage` rules.
5. Register the pack in `backend/app/domains/__init__.py` (add it to `DOMAINS`) and
   set `DEFAULT_PROFILE=<new_id>` in `.env`.
6. Add sample answers in `samples/<id>.json` (copy and adapt one) and the sample
   images in `frontend/public/sample/`.
7. Run `pytest`. `tests/test_domains.py` tells you what is missing.

If the new problem needs new kinds of facts, extend `KeyItemKind` in
`backend/app/schemas/analysis.py` **and** `frontend/src/api/types.ts`, and add an icon
and colour in `frontend/src/lib/kinds.ts`.

### Add a rule

Add one JSON object to the domain's `rules.json`. Rule types and examples are in
[HOW_IT_WORKS.md, section 10](HOW_IT_WORKS.md#10-accuracy--safety-harness). Then run
`pytest` and `python -m evaluation.benchmark` to check for false alarms.

### Add a harness check

1. Create `backend/app/harness/checks/<name>.py` with a class that has a `name`
   and `run(ctx: CheckContext) -> CheckOutput` (see `quality.py` for a small example).
2. Add an instance to `DEFAULT_CHECKS` in `backend/app/harness/checks/__init__.py`.
3. Add tests to `backend/tests/test_harness.py`; run the benchmark.

### Add an AI provider

1. Create `backend/app/analyzers/<name>.py` implementing `analyze(request) -> AnalysisResult`
   (see `trustedtokens.py`). Map provider errors to `AnalyzerError(message, status)`.
2. Add a branch in `create_analyzer()` (`backend/app/analyzers/__init__.py`) and its
   settings in `backend/app/core/config.py` and `.env.example`.
3. Test it against a fake HTTP transport like `tests/test_trustedtokens_analyzer.py`.

### Add a field to the analysis

Change `backend/app/schemas/analysis.py` and `frontend/src/api/types.ts` together,
then regenerate the API contract: `python scripts/export_openapi.py` (in `backend/`).
The JSON Schema sent to the AI is generated from the Pydantic model, so the AI
starts filling the field immediately. Update the sample answers
(`python scripts/make_samples.py` regenerates them) and display the field in the UI.

### Add a UI feature

Create `frontend/src/features/<name>/`. Keep state in `useAnalysis.ts` and keep
components presentational (props in, callbacks out).

## Conventions

- **No domain knowledge outside `backend/app/domains/<id>/`.** The engine stays generic.
- **Imports point downwards:** `api → services → (analyzers, harness, domains) → knowledge → schemas → core`.
- **User-facing errors** are `AppError(message, status)` (or `AnalyzerError` in analyzers).
- **Never log images or letter text.** Log ids, durations and status only.
- **Never commit `.env`** or keys. `.env.example` documents every variable.
