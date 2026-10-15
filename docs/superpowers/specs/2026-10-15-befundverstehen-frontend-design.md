# BefundVerstehen Frontend — Design Spec

**Date:** 2026-10-15 · **Status:** Approved · **Branch:** `feature/befundverstehen-frontend` (from `develop`)

Adapts the standalone BefundVerstehen spec (`hackathonAI/docs/superpowers/specs/2026-10-15-discharge-guide-design.md`)
to this repo: the UI is rebuilt inside `frontend/` and every piece of patient content comes from the existing
medical backend (`POST /api/analyze`, domain `medical_document`). **No backend changes.**

## Problem and user

Hospital discharge staff (nurse, discharge coordinator) photograph or upload a German discharge letter or
medication plan, check the result, and print a 1–2 page plain-language **handout** for the patient in the
patient's language. On the same screen they can walk the patient through an on-screen **guide**.

Success: staff go from upload to a printed, checked handout in about a minute; the patient can tell from the
handout why they were in hospital, what to take when, what to do now, and when to get help.

## Decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Where | Rebuild the UI inside the existing `frontend/`. Keep API client, `useAnalysis`, upload/page preparation, consent, `DocumentViewer` (highlights), read-aloud, `ChecksPanel`. Replace `App.tsx` and the screen layout. |
| 2 | Content source | Only today's `AnalysisResult` fields. No FAQ, glossary, "explain more simply", Ask-my-question or "your letter doesn't say" gaps. |
| 3 | QR / phone guide | Dropped. Results are not stored; the guide lives in the staff tool. The handout has no QR code. |
| 4 | Kept features | Photo with highlights, safety-check panel, read-aloud, readability score, consent step. |
| 5 | Removed features | Calendar reminders (`features/calendar/`), document-type switcher in the UI. The `german_letter` domain stays in the backend. |
| 6 | Languages | Handout/guide language is chosen **before** analysis from the medical domain's 12 `target_languages` (`/api/meta`), default "Einfache Sprache (simple German)". Changing it later re-runs the analysis after a confirm dialog ("This runs a new analysis"). Staff UI is German only. Arabic and Persian set `dir="rtl"` on the handout and guide only. |
| 7 | Fixed strings | Handout and guide headings, table headers, disclaimer and the general emergency box live in `frontend/src/i18n/handout.ts` for all 12 languages, keyed by the backend's language name. Marked "needs native-speaker and clinical review" in the file header. |
| 8 | Stack | React 19 + Vite + plain CSS with tokens (no Tailwind, no copy of the playbook's `components.css`). Add only `lucide-react`; `vitest` as a dev dependency. |
| 9 | Design system | **Minimal / Mono** from `hackathonAI/playbook/themes/minimal/DESIGN.md` (with `../FOUNDATIONS.md`). Its `theme.css` `:root` block is copied verbatim into `frontend/src/theme.css` (header comment names the source); components use `var(--token)` only. Light only; reduced motion, forced colours and hover = focus-visible parity per FOUNDATIONS §5. See **Design system mapping** below. |
| 10 | Font | DM Sans (400 and 600 only) for all text, JetBrains Mono 400 for doses, phone numbers, dates and section markers. Both vendored as woff2 from `hackathonAI/playbook/assets/fonts/` into `frontend/public/fonts/` (OFL; no CDN). |
| 11 | Phone numbers | Plain text, never `tel:` links. |
| 12 | Source of truth | Nothing appears that is not in the analysis, except the clearly labelled "General advice — not from your letter" emergency box. Where the analysis has no warning signs, the handout and guide say so and name whom to ask. |

## Design system mapping (Minimal / Mono)

| Element here | Minimal / Mono treatment |
|---|---|
| Staff UI type | Body 16/1.55, page title 30/600, h2 20/600, labels 14/600 (DESIGN §1.2). Sentence case everywhere. |
| Patient guide type | **Deliberate exception:** body 18 / 20 (default) / 24 px for older readers (text-size control), headings scaled in `rem` from the same ratios. Same fonts, weights and tokens. |
| One blue action per viewport | Start: "Analyse letter". Handout tab: "Print / Save as PDF". Read error: "Try again". Everything else outline, ghost or text link. |
| Workspace tabs | Underline tabs: 14/600, selected = `--foreground` text + 2px black indicator (not blue). |
| Sections (handout, guide, Check) | Signature motif: full-width 1px `--border` rule, mono marker "01", "02"… in the left gutter, title beside it. |
| Lists (medicines, diagnoses, contacts, findings, samples) | Rows over cards: open rows, min 48px, 1px top rule. Sample letters are radio-style rows, not cards. Panels (1px border, 12px radius) only for the A4 preview sheets and the consent box. |
| Status tags ("New", "Changed", "Please check", finding severity) | 4px radius, 1px border, 6px dot + word; dot colour from `--success` / `--warning` / `--destructive`; the word always shows. |
| Banners (poor image, confidence note, high-severity finding) | `--warning-surface` / `--warning-text` with icon. Errors `--destructive-surface` / `--destructive-text`. Demo mode `--info-surface` / `--info-text`. |
| Emergency box (112) | The only `--destructive` element on the handout and guide: `--destructive-surface` background, 1px `--destructive` border, siren icon, label "General advice — not from your letter". In print: black border, icon and text (B&W safe). |
| Low-confidence outline (preview only) | 1px dashed `--warning` + "Please check" status tag. |
| Doses, times, phone numbers, dates | JetBrains Mono 13–15px, tabular figures. |
| Motion | Colour-only hover, 140ms; no entrance animations; processing steps change state without movement. |
| Controls | 40px tall on desktop (44px under 768px); in the patient guide ≥48px. Focus ring 2px `--ring`, 2px offset. Inputs on white only. |
| Layout | `.container` 1200px, 24px gutters (16px under 768px), 4-based spacing scale. Workspace: settings cols 1–3, preview cols 4–12. |

## Staff flow

1. **Start.** Top bar (logo, BefundVerstehen). Headline "Entlassbrief verständlich machen", one supporting line.
   Handout language select (#6). Consent checkbox with the processor/region text from `/api/meta`
   (existing behaviour); the Analyse button is disabled until consent is ticked. Drop zone (photo or PDF,
   up to `max_pages`), existing page thumbnails. "Try a sample" cards for the two bundled medical samples.
   Demo-mode banner when `analyzer === "mock"`.
2. **Processing.** Three steps ticking off: "Reading the letter" → "Finding the important information" →
   "Writing it in plain language", each with a check icon and the text "Done"; `aria-live="polite"`. Steps
   1–2 are timed hints while the request runs; step 3 completes when the response arrives. Cancel aborts the
   request and returns to Start.
3. **Read error.** If `image_quality === "unreadable"`: "We couldn't read this clearly" with photo tips,
   "Try again" (back to Start with pages kept) and "Use a sample".
4. **Workspace** with three tabs. After processing, staff land on **Handout**.
   - **Handout:** settings panel left (print size Normal 12 pt / Large 14 pt (default); switches for
     "What to do now" and "Check-up"; medicines and warning signs cannot be switched off; language shown with
     a "Change" action per #6), live A4 preview centre with page counter, **Print / Save as PDF** top right.
   - **Check:** `DocumentViewer` with highlights, `ChecksPanel` findings, readability score.
   - **Patient guide:** Overview and Details (below).
   - A banner on the Handout tab when the checks report a high-severity finding, `image_quality === "poor"`,
     or a `confidence_note` is present; it links to the Check tab.
   - "New letter" in the top bar returns to Start.

Mobile/tablet: settings stack above the preview; tabs stay in normal flow.

## Handout

Fixed A4 sheets (210 × 297 mm), `@page { size: A4; margin: 0 }`, one sheet per printed page; the preview is
the same HTML that prints. Printed via `window.print()` (Chrome/Edge; Safari best effort). Black-and-white
safe; meaning never by colour alone.

**Page 1 — "Your hospital stay and what to do now"**
- Header: hospital from `sender`; "Made with BefundVerstehen" small; handwritten lines "Name: ____",
  "In hospital from ____ to ____" (the backend does not extract the patient's name or stay dates).
- **Why you were in hospital:** `summary`, then each `diagnosis` key item as plain `label` + `explanation`.
- **What to do now:** `action_steps` as a numbered list (switchable).
- **Your medicines:** table from `medications` whose `status !== "stopped"`. Columns: medicine (plain name, plus
  "Name on the box: {name} {strength}"), what it is for (`purpose`), then only the time columns used by at
  least one medicine among Morning / Noon / Evening / Night, each cell the dose as printed plus a tick box
  (empty cell when the dose is null or "0"). Notes row: `instructions` and `schedule_text`. Status tag as
  text: "New", "Changed" (none for continued/unknown).
- **Stop taking these:** list of `status === "stopped"` medicines with their `instructions`, only if any.

**Page 2 — "Help, check-up and contacts"**
- **When to get help:** general emergency box (siren icon, "Call 112", labelled "General advice — not from
  your letter"), then `warning_sign` items; if none: "Your letter does not list warning signs. Ask your doctor
  which signs to watch for."
- **Check-up:** `appointment` items (switchable).
- **Other instructions:** `instruction` items.
- **Contacts:** `contact` items.
- Footer: "Discussed with: ________ Date: ______" and disclaimer "This handout does not replace instructions
  from your care team."

Sections flow onto further sheets when they do not fit; content is never cut off. Each sheet measures its
content; the preview shows "N pages" and a warning when N > 2 or when a sheet overflows.

**Low confidence:** items/medications with `confidence === "low"` get a dashed outline and "Please check"
in the preview only (`@media print` hides both). Clicking one opens the Check tab focused on that item.

## Patient guide (on screen)

- Text size control (segmented, `aria-pressed`): 18 / 20 (default) / 24 px body, `rem`-based, persisted in
  `localStorage` (try/catch).
- Content in the analysis language; `dir="rtl"` for Arabic and Persian.
- **Overview:** summary, action steps, condensed warning signs (emergency box + first warning signs, link to Details).
- **Details:** diagnoses; "My day" (medicines grouped Morning / Noon / Evening / Night with counts, plus
  non-daily `schedule_text` medicines in their own group); medicine cards (plain name, purpose, dose, timing,
  instructions, status tag, "Name on the box"); instructions; check-up; warning signs and contacts.
- Read-aloud button per section (existing on-device speech).
- Touch targets ≥ 48 px, visible `:focus-visible`, semantic headings, tab ARIA, WCAG AA contrast.

## Errors

Icon + text, focus moved to the message.
- Wrong type / too large / too many pages: inline under the drop zone (existing checks).
- Missing consent: button disabled; a backend 428 shows its message.
- `unreadable`: Read error screen. `poor` or `confidence_note`: banner (Workspace #4).
- Network / backend `AppError`: message plus "Try again".

## Architecture

```
frontend/public/fonts/         dm-sans.woff2, jetbrains-mono.woff2 (from the playbook)
frontend/src/
  theme.css                    Minimal / Mono tokens, verbatim from the playbook
  styles.css                   @font-face, base, layout and component classes (tokens only)
  App.tsx                      screen state machine: start → processing → read-error | workspace
  i18n/handout.ts              fixed strings × 12 languages + rtl list
  features/start/              StartScreen, LanguageSelect, SampleCards
  features/processing/         ProcessingScreen, ReadErrorScreen
  features/workspace/          Workspace (tabs), HandoutSettings, WarningBanner
  features/handout/            buildHandout.ts (pure: AnalysisResult + settings → sections),
                               Handout.tsx (sheets), MedicineTable.tsx, usePageFit.ts, print.css
  features/guide/              PatientGuide, Overview, Details, MyDay, MedicineCard, TextSizeControl
  features/viewer/, safety/, accessibility/, upload/, analysis/   kept (Check tab, read-aloud, upload, state)
```
Removed: `features/calendar/`, `features/insights/`, `features/medication/MedicationSchedule.tsx` (replaced by
guide components), the domain switcher in `App.tsx`. `useAnalysis` keeps owning request state; the profile is
fixed to `medical_document`.

`buildHandout` and the guide grouping are pure functions so they can be unit-tested; components only render.

## Testing

- **Vitest** unit tests:
  - `buildHandout` on both bundled samples: used time columns only, stopped medicines separated, status tags,
    no-warning-signs fallback, switched-off sections omitted, low-confidence flags.
  - `i18n/handout.ts`: every language has every key, no empty strings; rtl list ⊆ languages; language names
    match the backend's `target_languages`.
  - Page-fit logic (sheet overflow → page count / warning) on a pure helper.
- `npm run build` passes (type-check + build). Backend pytest, ruff and benchmark unchanged and passing.
- Manual: Chrome print preview for both samples at 12 and 14 pt, in Einfache Sprache, English and Arabic;
  screens at 390 px and 1280 px; keyboard-only pass through the flow.
- All UI work and tests run with `ANALYZER=mock` (no paid AI calls).

## Out of scope

Backend or schema changes; FAQ, glossary, simpler explanations, Ask-my-question; QR code and phone guide;
result storage; checklist and drink tracker; calendar reminders; staff UI in other languages; dark mode;
Playwright/axe automation; real phone dialling.

## Before real use (owner)

Native-speaker review of the fixed strings in all 12 languages; clinical review of the emergency box and
handout wording.
