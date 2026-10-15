# 0005 — Page preparation and OCR verification in the browser

**Status:** Accepted

## Context

Phone photos are large and often rotated; PDFs need rendering; Vercel rejects
request bodies over 4.5 MB. Highlighting facts on the user's own photo is the
main trust feature, and its positions should be verified independently of the AI.

## Decision

- The browser normalises every input to compressed JPEG pages: EXIF rotation,
  resizing, PDF rendering with pdf.js (loaded on demand), and re-encoding until
  the upload fits the budget.
- In parallel with the AI request, the browser runs Tesseract OCR on each page.
  It locates each fact's quote on the photo (✓ found on page / ≈ approximate)
  and measures how much of the text on the photo the AI transcribed.

## Consequences

- The backend handles exactly one input type and stays small and fast.
- Verification adds no visible latency because it overlaps with the AI call.
- OCR language data comes from a CDN; if that is unavailable, results still
  appear, just without the verification badges.
- HEIC photos decode only in Safari.

## Alternatives considered

- **Server-side OCR:** heavy native dependencies in a serverless function, and
  no longer independent of the backend.
- **Trusting the model's bounding boxes:** approximate by nature; verification
  is what makes the highlights trustworthy.
