# BriefVerstehen backend: API handoff

Everything a frontend (or another Claude session) needs to build against the
backend **in parallel, without reading the backend code**. The backend is a
stateless FastAPI service; all endpoints are under `/api`.

- Machine-readable contract: [`docs/openapi.json`](openapi.json) (regenerate with
  `python scripts/export_openapi.py` in `backend/`). Interactive docs: `/api/docs`.
- TypeScript mirror of the contract: `frontend/src/api/types.ts`.
- Version: `0.2.0` (returned in `GET /api/meta`).

## 1. Run it (no API key needed)

```bash
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements-dev.txt          # macOS/Linux: .venv/bin/pip
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

Without `ANTHROPIC_API_KEY` / `TRUSTEDTOKENS_API_KEY` the backend runs in **demo
mode** (`analyzer: "mock"`): every upload returns a prepared, realistic answer.
Send the form field `sample=<id>` to choose which one (ids are listed in
`/api/meta`). That is enough to build the whole frontend.

- Base URL: `http://localhost:8000`. In the Vite dev server, proxy `/api` there.
- CORS: allowed origins come from `CORS_ORIGINS` (default `http://localhost:5173`).
- Every response has an `X-Request-ID` header (exposed to the browser). Send your
  own `X-Request-ID` to correlate logs.

## 2. Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness: `{"status": "ok"}` |
| GET | `/api/meta` | **Configure the UI**: provider and region, domains (profiles) with wording, samples, languages, privacy settings, limits |
| POST | `/api/analyze` | **Analyse a document**: multipart upload of page images, returns `{ result, checks, ... }` |
| GET | `/api/knowledge/{profile_id}` | Knowledge graph (ontology + rules) of a domain as node-link JSON (for inspection) |

### GET /api/meta

The UI should build itself from this response:

- `profiles[]` are the **domain packs**. Show a switcher if there is more than one;
  `default_profile` is preselected.
- Per profile:
  - `ui`: every text of the start screen. `upload_hint` contains `{max_pages}`.
  - `samples`: "Try a sample" buttons. `image` is a path the frontend serves itself.
  - `languages`: the "Explain in" options.
  - `privacy`: consent and redaction (see section 4).
  - `ocr_language`: the Tesseract code for in-browser OCR.
- `processing`: who processes uploads and where. Show it, and warn if `eu` is false
  and the profile's `privacy.recommend_eu_processing` is true.

Example (trimmed; `…` marks omitted entries):

```json
{
  "version": "0.2.0",
  "analyzer": "mock",
  "processing": {
    "provider": "none (demo mode)",
    "region": "no data leaves the server",
    "eu": true
  },
  "default_profile": "medical_document",
  "profiles": [
    {
      "id": "medical_document",
      "name": "Medical document",
      "description": "Discharge letters, doctor's letters and medication plans, explained in simple language.",
      "source_language": "German",
      "ocr_language": "deu",
      "ui": {
        "headline": "Understand your doctor's letter and medication plan",
        "intro": "Take a photo of a hospital discharge letter, a doctor's letter or a medication plan. You get a simple explanation, a daily plan for your medicines, the warning signs to watch for and what to do next. Everything can be read aloud.",
        "upload_title": "Photograph or upload your document",
        "upload_hint": "Photos (JPEG, PNG) or a PDF · up to {max_pages} pages · lay the page flat in good light",
        "disclaimer": "This app explains documents. It does not replace your doctor or pharmacist. Never stop or change a medicine without asking them. In an emergency call 112.",
        "progress": [
          "Reading your document…",
          "Finding your medicines and doses…",
          "Explaining diagnoses in simple words…",
          "Checking everything against the document…"
        ]
      },
      "samples": [
        {
          "id": "entlassbrief",
          "label": "Hospital discharge letter",
          "image": "/sample/entlassbrief.png"
        },
        {
          "id": "medikationsplan",
          "label": "Medication plan",
          "image": "/sample/medikationsplan.png"
        }
      ],
      "privacy": {
        "data_category": "health",
        "requires_consent": true,
        "consent_text": "This document contains health data, a special category of personal data (Art. 9 DSGVO/GDPR). I explicitly agree that the photo is sent to {provider} ({region}) only to explain it to me. Personal details such as my name and date of birth are hidden on my device first, if that option is on. Nothing is stored. I can stop at any time by closing this page.",
        "recommend_eu_processing": true,
        "redact_personal_data": true
      },
      "languages": [
        "Einfache Sprache (simple German)",
        "English",
        "Turkish",
        "…"
      ]
    },
    {
      "id": "german_letter",
      "name": "German official letter",
      "…": "same fields"
    }
  ],
  "languages": [
    "Einfache Sprache (simple German)",
    "English",
    "Turkish",
    "…"
  ],
  "max_pages": 6,
  "max_total_upload_bytes": 4400000
}
```

### POST /api/analyze

`multipart/form-data`:

| Field | Type | Required | Meaning |
|---|---|---|---|
| `files` | file (repeat per page) | yes | Page images in reading order: **JPEG, PNG, WebP or GIF** (detected by content). PDFs must be rendered to images in the browser. At most `max_pages` files, together at most `max_total_upload_bytes` (4.4 MB, Vercel limit) |
| `profile` | string | no | Domain id, e.g. `medical_document`. Default: `default_profile` |
| `target_language` | string | no | One of the profile's `languages`. Default `English` |
| `consent` | `"true"` | **if `privacy.requires_consent`** | Explicit consent for health data (GDPR Art. 9). Without it the request fails with **428** |
| `sample` | string | no | Demo mode only: which prepared answer to return |

Response `200` (trimmed; `…` marks omitted entries):

```json
{
  "result": {
    "document_type": "Hospital discharge letter (Entlassbrief)",
    "document_class": "discharge_letter",
    "image_quality": "good",
    "sender": "Klinikum Musterstadt, Department of Internal Medicine",
    "source_language": "German",
    "target_language": "English",
    "summary": "You were in hospital from 1 to 8 October 2026. You had an infection of the kidney. It got better with antibiotics. You have a new medicine for your blood pressure. Do not take Metformin for now. See your family doctor on 15 October 2026.",
    "action_steps": [
      "Take your medicines as shown in your daily plan.",
      "Take the antibiotic Cefuroxim until 12 October 2026. Then it is finished.",
      "…"
    ],
    "key_items": [
      {
        "id": "k4",
        "kind": "warning_sign",
        "importance": "high",
        "label": "Get help at once if…",
        "value": "Fieber über 38,5 °C, starke Flankenschmerzen, Verwirrtheit",
        "explanation": "If you get a fever over 38.5 degrees, strong pain in your side, or feel confused: see your doctor at once, or go to the emergency department.",
        "date": null,
        "amount": null,
        "currency": null,
        "page": 0,
        "bbox": {
          "x0": 102,
          "y0": 690,
          "x1": 894,
          "y1": 730
        },
        "source_quote": "Bei Fieber über 38,5 °C, starken Flankenschmerzen oder Verwirrtheit stellen Sie sich bitte sofort beim Hausarzt oder in der Notaufnahme vor.",
        "confidence": "high"
      },
      "…"
    ],
    "medications": [
      {
        "id": "m0",
        "name": "Ramipril",
        "active_ingredient": null,
        "strength": "5 mg",
        "form": null,
        "morning": "1",
        "noon": "0",
        "evening": "1",
        "night": "0",
        "schedule_text": null,
        "status": "continued",
        "purpose": "For your blood pressure.",
        "instructions": "Take one tablet in the morning and one in the evening.",
        "page": 0,
        "bbox": {
          "x0": 102,
          "y0": 532,
          "x1": 407,
          "y1": 552
        },
        "source_quote": "Ramipril 5 mg 1-0-1-0 (unverändert)",
        "confidence": "high"
      },
      {
        "id": "m3",
        "name": "Metformin",
        "active_ingredient": null,
        "strength": "1000 mg",
        "form": null,
        "morning": null,
        "noon": null,
        "evening": null,
        "night": null,
        "schedule_text": null,
        "status": "stopped",
        "purpose": "For your blood sugar.",
        "instructions": "Do not take it for now. Your doctor will tell you when to start again.",
        "page": 0,
        "bbox": {
          "x0": 102,
          "y0": 594,
          "x1": 401,
          "y1": 613
        },
        "source_quote": "Metformin 1000 mg wurde pausiert.",
        "confidence": "high"
      },
      "…"
    ],
    "blocks": [
      {
        "id": "p0-b6",
        "page": 0,
        "bbox": {
          "x0": 105,
          "y0": 377,
          "x1": 384,
          "y1": 454
        },
        "original": "Diagnosen:\nAkute Pyelonephritis rechts (N10)\nArterielle Hypertonie (I10.90)\nDiabetes mellitus Typ 2 (E11.90)",
        "translation": "Diagnoses:\nAcute kidney infection, right side (N10)\nHigh blood pressure (I10.90)\nType 2 diabetes (E11.90)"
      },
      "…"
    ],
    "confidence_note": null,
    "suspicious_instructions": null
  },
  "checks": {
    "document_class": {
      "id": "discharge_letter",
      "label": "Hospital discharge letter (Entlassbrief)",
      "lineage": [
        "discharge_letter",
        "clinical_letter",
        "medical_document"
      ],
      "source": "model"
    },
    "findings": [
      {
        "rule_id": "E-RED-FLAGS",
        "category": "escalation",
        "severity": "info",
        "message": "The document names warning signs (Fieber über). If they occur: in an emergency call 112; outside practice hours call 116117.",
        "item_ids": [],
        "evidence": "… 15.10.2026 zur Kontrolle von Kreatinin und Blutzucker. Bei Fieber über 38,5 °C, starken Flankenschmerzen oder Verwirrtheit …",
        "legal_basis": null
      },
      "…"
    ],
    "item_checks": {
      "k0": {
        "item_id": "k0",
        "grounded": true,
        "issues": []
      },
      "k1": {
        "item_id": "k1",
        "grounded": true,
        "issues": []
      },
      "…": "one entry per key item and medication id"
    },
    "escalation": {
      "reason": "You have a right to an explanation you can understand (§ 630e BGB) and to see your records (§ 630g BGB). Ask your doctor about anything that is unclear. The document names warning signs (Fieber über). If they occur: in an emergency call 112; outside practice hours call 116117.",
      "resources": [
        {
          "id": "gp",
          "label": "Your family doctor (Hausarzt)",
          "url": null,
          "description": "Ask about anything that is unclear. Bring this explanation and your medication plan."
        },
        "…"
      ]
    },
    "scam_suspected": false,
    "readability": {
      "score": 73.9,
      "level": "fairly easy",
      "target": 60.0,
      "avg_sentence_words": 6.9,
      "language": "en"
    },
    "summary": {
      "total_items": 12,
      "grounded_items": 12,
      "critical": 0,
      "warnings": 0,
      "infos": 1
    }
  },
  "analyzer": "mock",
  "profile": "medical_document",
  "page_count": 1
}
```

What the fields mean:

- **`result`** is produced by the AI. It is validated against a JSON Schema, so every
  field is always present.
  - `blocks[]`: the transcription and translation per paragraph, with `bbox`
    (0 to 1000 page units, origin top-left) for overlays.
  - `key_items[]`: facts to show as cards and highlights. Kinds: `deadline`,
    `payment`, `appointment`, `reference`, `contact`, `consequence`,
    `document_required`, `medication`, `diagnosis`, `warning_sign`, `instruction`,
    `other`.
  - `medications[]`: medicines with dose columns **exactly as printed**: `morning`,
    `noon`, `evening`, `night` (`"1"`, `"½"`, `"0"` or null), plus `schedule_text`
    for weekly or as-needed rules. `status` is `new`, `changed`, `continued`,
    `stopped` or `unknown`. Show stopped ones as "do not take".
  - `source_quote` (key items and medications): the exact document text, used to
    verify the fact on the photo with browser OCR.
- **`checks`** is produced by the backend harness (code, not AI). Show it.
  - `summary`: `grounded_items` / `total_items` ("facts traced to the document"), counts.
  - `item_checks[id].grounded`: if false, mark that card or medicine "not found in
    the document".
  - `findings[]`: `severity` is `critical`, `warning` or `info`. `category` is one of
    `grounding`, `completeness`, `legal`, `scam`, `injection`, `quality`,
    `escalation`, `advice`, `readability`, `safety`. `item_ids` link to cards;
    `evidence` and `legal_basis` are optional.
  - `scam_suspected`: show a prominent alarm.
  - `escalation`: a "get help" box with `resources[]` (label, url, description).
  - `readability`: `score` 0 to 100 vs `target`, and `level` ("fairly easy", ...).
    Null if not scored.

### Errors

All errors are JSON `{"detail": "<message for the user>"}`. Show `detail` as it is.

| Status | When |
|---|---|
| 400 | No files, too many pages, unknown profile, the AI rejected the input |
| 413 | Upload too large, or the document was too long to analyse |
| 415 | A file is not a supported image |
| 422 | The photo is unreadable ("please retake"), or the AI declined. FastAPI's own validation errors also use 422, with a list in `detail` |
| **428** | **Health document without `consent=true`** |
| 429 | Rate limit at the AI provider |
| 500 / 502 / 504 | Configuration, provider error, timeout |

```json
{
  "status": 428,
  "body": {
    "detail": "Please confirm the privacy consent before uploading this document. It contains health data, which may only be processed with your explicit consent."
  }
}
```

## 3. What the frontend is responsible for

1. **Prepare pages:** fix EXIF rotation, resize (long edge at most 2000 px), render
   PDFs to JPEG, and keep the total under `max_total_upload_bytes`.
2. **Consent** (if `privacy.requires_consent`): a checkbox with `consent_text`
   (replace `{provider}` and `{region}` from `processing`); send `consent=true`.
3. **Redaction** (data minimisation; default from `privacy.redact_personal_data`): OCR
   in the browser, black out name, date of birth, address and insurance or case
   numbers on a **copy**, and upload only the copy. The backend never sees the
   original. Reference implementation: `frontend/src/features/privacy/redact.ts`.
4. **Verification:** match each `source_quote` against browser OCR to show "found on
   page", and compute text coverage, excluding redacted words.
5. **Show** the harness report (`checks`), the medicine plan (`medications`),
   warnings and help resources; offer read aloud, larger text and high contrast.

## 4. Privacy settings per profile

| Field | medical_document | german_letter | Frontend behaviour |
|---|---|---|---|
| `data_category` | `health` | `personal` | Informational |
| `requires_consent` | `true` | `false` | Require the consent checkbox; send `consent=true` |
| `recommend_eu_processing` | `true` | `false` | Warn if `processing.eu` is false |
| `redact_personal_data` | `true` | `false` | Default of the "hide personal details" option |

## 5. Contract rules for parallel work

- The backend contract is defined in `backend/app/schemas/` (`analysis.py`,
  `harness.py`, `api.py`). Any change there must be mirrored in
  `frontend/src/api/types.ts`, and `docs/openapi.json` regenerated.
- During the hackathon, fields are only **added**, never renamed or removed. The
  frontend should ignore unknown fields.
- Sample answers live in `backend/app/domains/<profile>/samples/<id>.json`; the
  matching images in `frontend/public/sample/<id>.png`.
