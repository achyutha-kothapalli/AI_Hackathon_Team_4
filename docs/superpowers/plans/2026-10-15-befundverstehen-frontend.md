# BefundVerstehen Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `frontend/` as a German staff tool that turns a medical analysis from `/api/analyze` into a printable A4 patient handout (12 languages) and an on-screen patient guide, styled with the Minimal / Mono design system.

**Architecture:** Pure functions turn `AnalysisResult` into a `HandoutModel` (`buildHandout`), into flow blocks, and into sheets (`paginate`); React components only render. `useAnalysis` stays the single owner of request state; `screenFor` derives which screen to show. Fixed patient-facing strings live in `i18n/handout.ts`; staff UI strings are German literals.

**Tech Stack:** React 19, Vite 8, TypeScript (strict), plain CSS with design tokens, lucide-react, Vitest 5 (node environment, pure-function tests only).

**Spec:** `docs/superpowers/specs/2026-10-15-befundverstehen-frontend-design.md` (read it before any task).
**Design system:** `/Users/meenn/Documents/developments/hackathonAI/playbook/themes/minimal/DESIGN.md` and `../FOUNDATIONS.md`.

## Global Constraints

- **No backend changes.** `frontend/src/api/types.ts` is not modified.
- Profile is fixed to `medical_document`. Default handout language `"Einfache Sprache (simple German)"`.
- Colours only via `var(--token)`; `frontend/src/theme.css` is a verbatim copy of the playbook's `themes/minimal/theme.css`.
- Fonts: DM Sans weights 400 and 600 only; JetBrains Mono 400 for doses, dates, phone numbers, section markers. Vendored in `frontend/public/fonts/`.
- One filled primary (blue) button per viewport. Labels are verb + object, sentence case.
- Status never by colour alone (icon or dot + word). Visible `:focus-visible` ring (`2px solid var(--ring)`, offset 2px). Hover = focus-visible treatment.
- Phone numbers are plain text, never `tel:` links.
- Staff UI text is German. Patient-facing fixed text comes only from `i18n/handout.ts`; AI text is shown as returned. Backend-provided text (finding messages, consent text, errors) is shown as returned.
- Never log images or letter text (no `console.log` of results).
- All UI work runs with the backend in demo mode (`ANALYZER=mock`); never trigger paid AI calls.
- After every task: `cd frontend && npm test && npm run build` must pass.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

## Review Focus

1. **Result language differs from the requested one** (demo mode always returns `target_language: "English"`): handout strings, `dir` and `lang` follow `result.target_language`, never the language the staff selected. Test in Task 3.
2. **Medicine with no daily dose** (weekly methotrexate, "as needed" paracetamol, all dose columns null): stays in the medicine table with empty time cells and its `schedule_text` as a note; in the guide it appears under "Not every day". Tests in Tasks 3 and 8.
3. **Empty categories** (no diagnoses, no check-up, no contacts, no action steps): the section is omitted entirely, never an empty heading; warning signs instead show the "Your letter does not list warning signs" fallback. Tests in Tasks 3 and 7.
4. **A single block taller than one sheet** (very long summary): placed alone on its own sheet, flagged as overflowing, no endless loop; the next block starts a new sheet. Test in Task 4.
5. **Cancel or failure during a re-analysis while a result is shown**: returns to the existing workspace (not the start screen); a failure shows the error and keeps the old result. Tests in Task 5.

## Parallel execution waves

Tasks touch disjoint files within a wave. Run each wave's tasks in parallel (separate worktrees), merge into `feature/befundverstehen-frontend`, run `npm test && npm run build`, then start the next wave.

| Wave | Tasks | Depends on |
|---|---|---|
| 0 | Shared setup (done, commit `db0c07f`): vitest, lucide-react, `src/test/samples.ts`, tsconfig excludes tests | — |
| 1 | Task 1 (theme + primitives), Task 2+3 (i18n + handout model), Task 4 (paginate), Task 5 (screen state + useAnalysis) | Wave 0 |
| 2 | Task 6 (start/processing/read-error + App), Task 7 (handout rendering), Task 8 (patient guide) | Wave 1 |
| 3 | Task 9 (workspace + Check tab + final App wiring) | Wave 2 |
| 4 | Task 10 (cleanup, docs, verification) | Wave 3 |

**Worktree note:** a fresh worktree has no `frontend/node_modules`. Run `cd frontend && npm ci` first (or `ln -s /Users/meenn/Documents/developments/AI_Hackathon_Team_4/frontend/node_modules frontend/node_modules`).

## File map (final state)

```
frontend/public/fonts/dm-sans.woff2, jetbrains-mono.woff2           Task 1
frontend/src/theme.css                                              Task 1 (verbatim playbook tokens)
frontend/src/styles.css                                             Task 1 (fonts, base, aliases, shared components), Task 10 (cleanup)
frontend/src/components/StatusTag.tsx, SectionHead.tsx, Banner.tsx  Task 1
frontend/src/i18n/handout.ts                                        Task 2
frontend/src/features/handout/model.ts                              Task 3
frontend/src/features/handout/paginate.ts                           Task 4
frontend/src/features/analysis/screen.ts                            Task 5
frontend/src/features/analysis/useAnalysis.ts                       Task 5 (modified)
frontend/src/features/start/StartScreen.tsx, DropZone.tsx, start.css            Task 6
frontend/src/features/processing/ProcessingScreen.tsx, ReadErrorScreen.tsx, processing.css  Task 6
frontend/src/components/StaffTopBar.tsx                             Task 6
frontend/src/features/handout/blocks.tsx, Handout.tsx, handout.css  Task 7
frontend/src/features/guide/myDay.ts, prefs.ts, PatientGuide.tsx, Overview.tsx, Details.tsx, TextSizeControl.tsx, guide.css  Task 8
frontend/src/features/accessibility/ReadAloudButton.tsx             Task 8 (modified)
frontend/src/features/workspace/Workspace.tsx, HandoutSettings.tsx, CheckTab.tsx, workspace.css  Task 9
frontend/src/features/safety/ChecksPanel.tsx                        Task 9 (German labels, restyle)
frontend/src/App.tsx                                                Tasks 5, 6, 9
Deleted in Task 10: features/insights/, features/medication/, features/calendar/, features/upload/UploadPanel.tsx,
  features/accessibility/DisplaySettings.tsx, components/Progress.tsx
```

---

### Task 1: Minimal / Mono theme, fonts and shared UI primitives

**Files:**
- Create: `frontend/public/fonts/dm-sans.woff2`, `frontend/public/fonts/jetbrains-mono.woff2`, `frontend/src/theme.css`, `frontend/src/components/StatusTag.tsx`, `frontend/src/components/SectionHead.tsx`, `frontend/src/components/Banner.tsx`
- Modify: `frontend/src/styles.css`, `frontend/src/main.tsx`, `frontend/index.html`, `frontend/src/config/app.ts`
- Test: `frontend/src/test/theme.test.ts`

**Interfaces:**
- Produces (used by Tasks 6–9):
  - `StatusTag({ tone, children }: { tone: "neutral" | "success" | "warning" | "danger"; children: ReactNode })` → `<span class="status-tag tone-…"><span class="dot" aria-hidden/>{children}</span>`
  - `SectionHead({ marker, id, children, level = 2 }: { marker?: string; id?: string; children: ReactNode; level?: 2 | 3 })` → ruled row with mono marker ("01") and heading
  - `Banner({ tone, title, children, action, role }: { tone: "info" | "warning" | "danger" | "success"; title?: string; children?: ReactNode; action?: ReactNode; role?: "alert" | "status" })` → icon + text banner
  - CSS classes in `styles.css`: `.btn` (+ `.btn-primary`, `.btn-outline`, `.btn-ghost`, `.btn-link`, `.btn-block`), `.field`, `.label`, `.hint`, `.select`, `.checkbox`, `.rows` / `.row` (open rows), `.tabs-underline` / `.tab`, `.panel`, `.container`, `.mono`, `.muted`, `.sr-only`, `.section-head`, `.section-marker`, `.status-tag`, `.banner` (+ `.banner-info|warning|danger|success`)

- [ ] **Step 1: Write the failing test** — `frontend/src/test/theme.test.ts`

```ts
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = (p: string) => new URL(`../${p}`, import.meta.url);
const pub = (p: string) => new URL(`../../public/${p}`, import.meta.url);

describe("Minimal / Mono theme", () => {
  const theme = readFileSync(src("theme.css"), "utf8");
  it("defines the tokens the components use", () => {
    for (const t of [
      "--background", "--foreground", "--card", "--muted", "--muted-foreground", "--border", "--border-strong",
      "--input", "--primary", "--primary-hover", "--primary-active", "--primary-foreground", "--accent",
      "--accent-foreground", "--ring", "--success", "--warning", "--destructive", "--warning-surface",
      "--warning-text", "--destructive-surface", "--destructive-text", "--info-surface", "--info-text",
      "--success-surface", "--success-text", "--font-sans", "--font-mono", "--radius", "--radius-lg",
    ]) expect(theme, t).toContain(`${t}:`);
    expect(theme).toContain("--primary: #2F5BEA;");
  });
  it("vendors the fonts", () => {
    expect(existsSync(pub("fonts/dm-sans.woff2"))).toBe(true);
    expect(existsSync(pub("fonts/jetbrains-mono.woff2"))).toBe(true);
  });
  it("is light only and loads the fonts", () => {
    const styles = readFileSync(src("styles.css"), "utf8");
    expect(styles).not.toContain("prefers-color-scheme");
    expect(styles).toContain('url("/fonts/dm-sans.woff2")');
    expect(readFileSync(src("main.tsx"), "utf8")).toMatch(/import "\.\/theme\.css";\s*import "\.\/styles\.css";/);
  });
});
```

- [ ] **Step 2: Run it** — `cd frontend && npx vitest run src/test/theme.test.ts` → FAIL (theme.css missing).

- [ ] **Step 3: Copy theme and fonts**

```bash
PB=/Users/meenn/Documents/developments/hackathonAI/playbook
mkdir -p frontend/public/fonts
cp "$PB/assets/fonts/dm-sans.woff2" "$PB/assets/fonts/jetbrains-mono.woff2" frontend/public/fonts/
cp "$PB/themes/minimal/theme.css" frontend/src/theme.css
```
Then prepend one line to `frontend/src/theme.css`: `/* Copied verbatim from hackathonAI/playbook/themes/minimal/theme.css (Minimal / Mono). Do not edit here. */`

- [ ] **Step 4: Rewire `styles.css` onto the theme**

In `frontend/src/styles.css`:
1. `sed -i '' 's/var(--muted)/var(--muted-foreground)/g' frontend/src/styles.css` (the old `--muted` was a text colour; the theme's `--muted` is a surface).
2. Check `sed -n '1p;53p' frontend/src/styles.css` prints `:root {` and `}`; delete lines 1–53 (old `:root` and the dark-mode block) and put this at the top:

```css
@font-face {
  font-family: "DM Sans";
  src: url("/fonts/dm-sans.woff2") format("woff2");
  font-weight: 100 1000;
  font-display: swap;
}
@font-face {
  font-family: "JetBrains Mono";
  src: url("/fonts/jetbrains-mono.woff2") format("woff2");
  font-weight: 100 800;
  font-display: swap;
}

/* Old names used by the kept components (viewer, checks), mapped onto theme tokens. Removed in Task 10. */
:root {
  --bg: var(--background);
  --surface: var(--card);
  --surface-2: var(--secondary);
  --text: var(--foreground);
  --brand: var(--primary);
  --brand-ink: var(--primary-foreground);
  --focus: var(--ring);
  --danger: var(--destructive);
  --danger-bg: var(--destructive-surface);
  --warn: var(--warning);
  --warn-bg: var(--warning-surface);
  --info-bg: var(--info-surface);
  --ok: var(--success);
  --paper: var(--card);
  /* kind palette:start (highlight colours on the photo; the only literal colours outside theme.css) */
  --teal: #0f766e;
  --teal-bg: #14b8a633;
  --violet: #6d28d9;
  --violet-bg: #8b5cf62e;
  --neutral: #4b5563;
  --neutral-bg: #6b72802e;
  /* kind palette:end */
}
```
3. Replace the `body` rule with:

```css
body {
  margin: 0;
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
```
4. Replace the `:focus-visible` rule with `:focus-visible { outline: var(--ring-width) solid var(--ring); outline-offset: var(--ring-offset); }`.

- [ ] **Step 5: Append the shared component layer to `styles.css`** (Minimal / Mono, DESIGN §1–§2)

```css
/* ---------- Minimal / Mono components ---------- */
.container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
@media (max-width: 767px) { .container { padding: 0 16px; } }
.mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
.muted { color: var(--muted-foreground); }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
h1, h2, h3 { font-weight: 600; margin: 0; text-wrap: balance; }
p { text-wrap: pretty; }

.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: var(--control-height); padding: 0 16px; border-radius: var(--radius); border: 1px solid transparent; font: 600 15px/1 var(--font-sans); cursor: pointer; text-decoration: none; transition: background-color var(--duration-hover) var(--ease-out), border-color var(--duration-hover) var(--ease-out); }
@media (max-width: 767px) { .btn { min-height: 44px; } }
.btn-primary { background: var(--primary); color: var(--primary-foreground); }
.btn-primary:hover, .btn-primary:focus-visible { background: var(--primary-hover); }
.btn-primary:active { background: var(--primary-active); }
.btn-outline { background: var(--card); color: var(--foreground); border-color: var(--border-strong); }
.btn-outline:hover, .btn-outline:focus-visible { background: var(--secondary); }
.btn-outline:active { background: var(--secondary-hover); }
.btn-outline[aria-pressed="true"] { background: var(--accent); color: var(--accent-foreground); border-color: var(--primary); }
.btn-ghost { background: transparent; color: var(--foreground); }
.btn-ghost:hover, .btn-ghost:focus-visible { background: var(--secondary); }
.btn-link { background: none; border: 0; padding: 0; min-height: 0; color: var(--foreground); text-decoration: underline 1px; text-underline-offset: 3px; text-decoration-color: var(--border-strong); font-weight: 600; }
.btn-link:hover, .btn-link:focus-visible { text-decoration-color: var(--primary); }
.btn-block { width: 100%; }
.btn:disabled, .btn[aria-disabled="true"] { background: var(--primary-disabled); color: var(--primary-disabled-foreground); border-color: var(--border); cursor: not-allowed; }

.field { display: grid; gap: 6px; }
.label { font: 600 14px/1.2 var(--font-sans); }
.hint { font-size: 14px; color: var(--muted-foreground); margin: 0; }
.select { min-height: var(--control-height); padding: 0 12px; border: 1px solid var(--input); border-radius: var(--radius); background: var(--input-bg); color: var(--foreground); font: 400 16px var(--font-sans); }
.select:hover { border-color: var(--input-hover, #6B6B6B); }
.checkbox { display: flex; gap: 12px; align-items: flex-start; }
.checkbox input { width: 20px; height: 20px; margin: 2px 0 0; accent-color: var(--primary); flex: none; }

.rows { list-style: none; margin: 0; padding: 0; }
.row { min-height: 48px; padding: 12px 16px; border-top: 1px solid var(--border); }
.rows > .row:last-child { border-bottom: 1px solid var(--border); }
.row[aria-checked="true"], .row.is-selected { background: var(--accent); box-shadow: inset 2px 0 0 var(--primary); }

.panel { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 24px; }

.tabs-underline { display: flex; gap: 24px; border-bottom: 1px solid var(--border); }
.tabs-underline .tab { background: none; border: 0; padding: 12px 0; margin-bottom: -1px; font: 600 14px/1.2 var(--font-sans); color: var(--muted-foreground); border-bottom: 2px solid transparent; cursor: pointer; }
.tabs-underline .tab:hover, .tabs-underline .tab:focus-visible { color: var(--foreground); }
.tabs-underline .tab[aria-selected="true"] { color: var(--foreground); border-bottom-color: var(--foreground); }

.section-head { display: grid; grid-template-columns: 48px 1fr auto; align-items: baseline; gap: 0 12px; border-top: 1px solid var(--border); padding-top: 24px; margin-bottom: 16px; }
.section-marker { font: 400 13px/1 var(--font-mono); letter-spacing: 0.02em; color: var(--muted-foreground); }
.section-head h2 { font-size: 20px; line-height: 1.3; letter-spacing: -0.01em; }
.section-head h3 { font-size: 16px; line-height: 1.4; }

.status-tag { display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 8px; border: 1px solid var(--border); border-radius: var(--radius-badge); font: 600 13px/1 var(--font-sans); background: var(--card); color: var(--foreground); white-space: nowrap; }
.status-tag .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--muted-foreground); }
.status-tag.tone-success .dot { background: var(--success); }
.status-tag.tone-warning .dot { background: var(--warning); }
.status-tag.tone-danger .dot { background: var(--destructive); }

.banner { display: flex; gap: 12px; align-items: flex-start; padding: 12px 16px; border-radius: var(--radius); border: 1px solid transparent; }
.banner svg { flex: none; margin-top: 2px; }
.banner p { margin: 0; }
.banner-title { font-weight: 600; }
.banner-action { margin-left: auto; flex: none; }
.banner-info { background: var(--info-surface); color: var(--info-text); }
.banner-warning { background: var(--warning-surface); color: var(--warning-text); }
.banner-danger { background: var(--destructive-surface); color: var(--destructive-text); }
.banner-success { background: var(--success-surface); color: var(--success-text); }

@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition-duration: 0ms !important; animation: none !important; scroll-behavior: auto !important; } }
@media (forced-colors: active) { .btn, .panel, .status-tag, .banner { border: 1px solid CanvasText; } }
```
If the old file already has a `.sr-only` or `.btn` rule, delete the old one (the new layer replaces it). Keep `.btn.read-aloud` and other old rules for now.

- [ ] **Step 6: Primitives**

`frontend/src/components/StatusTag.tsx`:
```tsx
import type { ReactNode } from "react";

export type Tone = "neutral" | "success" | "warning" | "danger";

/** Minimal / Mono status tag: dot + word, never colour alone. */
export function StatusTag({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`status-tag tone-${tone}`}>
      <span className="dot" aria-hidden="true" />
      {children}
    </span>
  );
}
```

`frontend/src/components/SectionHead.tsx`:
```tsx
import type { ReactNode } from "react";

interface Props {
  marker?: string; // "01", "02", …
  id?: string;
  level?: 2 | 3;
  aside?: ReactNode; // e.g. a read-aloud button, right-aligned
  children: ReactNode;
}

/** Signature motif: hairline rule, mono number in the gutter, title beside it. */
export function SectionHead({ marker, id, level = 2, aside, children }: Props) {
  const H = level === 2 ? "h2" : "h3";
  return (
    <div className="section-head">
      <span className="section-marker" aria-hidden="true">{marker ?? ""}</span>
      <H id={id} tabIndex={-1}>{children}</H>
      {aside ?? <span />}
    </div>
  );
}
```

`frontend/src/components/Banner.tsx`:
```tsx
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "info" | "warning" | "danger" | "success";
const ICON = { info: Info, warning: AlertTriangle, danger: OctagonAlert, success: CheckCircle2 } as const;

interface Props {
  tone: Tone;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  role?: "alert" | "status";
}

export function Banner({ tone, title, children, action, role }: Props) {
  const Icon = ICON[tone];
  return (
    <div className={`banner banner-${tone}`} role={role}>
      <Icon size={18} aria-hidden="true" />
      <div>
        {title && <p className="banner-title">{title}</p>}
        {children && <div>{children}</div>}
      </div>
      {action && <div className="banner-action">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 7: Entry and branding**
  - `frontend/src/main.tsx`: replace `import "./styles.css";` with `import "./theme.css";\nimport "./styles.css";`.
  - `frontend/src/config/app.ts`: `export const APP_NAME = "BefundVerstehen";`
  - `frontend/index.html`: `<html lang="de">`, `<title>BefundVerstehen</title>`, description `Entlassbriefe in ein verständliches Patientenblatt verwandeln.`

- [ ] **Step 8: Verify** — `cd frontend && npm test && npm run build` → all pass. Optional visual check: `npm run dev`, the existing UI renders in DM Sans on white.

- [ ] **Step 9: Commit** — `git add -A frontend && git commit -m "feat(frontend): Minimal / Mono theme, vendored fonts and shared UI primitives"`

---

### Task 2: Fixed patient-facing strings in 12 languages

**Files:**
- Create: `frontend/src/i18n/handout.ts`
- Test: `frontend/src/i18n/handout.test.ts`

**Interfaces:**
- Produces:
  - `LANGUAGES: readonly HandoutLanguage[]` (exactly the backend's medical `target_languages`, same order)
  - `interface HandoutStrings` (keys below)
  - `stringsFor(language: string): HandoutStrings` (exact match, otherwise English)
  - `dirFor(language: string): "ltr" | "rtl"` (rtl for "Arabic", "Persian")
  - `htmlLangFor(language: string): string` (BCP-47; unknown → "en")

- [ ] **Step 1: Write the failing test** — `frontend/src/i18n/handout.test.ts`

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LANGUAGES, dirFor, htmlLangFor, stringsFor } from "./handout";

function backendLanguages(): string[] {
  const py = readFileSync(
    new URL("../../../backend/app/domains/medical_document/__init__.py", import.meta.url),
    "utf8",
  );
  const tuple = /target_languages=\(([\s\S]*?)\),/.exec(py)![1];
  return [...tuple.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

describe("handout strings", () => {
  it("covers exactly the backend's medical languages", () => {
    expect([...LANGUAGES]).toEqual(backendLanguages());
  });
  it("has every key, non-empty, in every language", () => {
    const keys = Object.keys(stringsFor("English")).sort();
    for (const lang of LANGUAGES) {
      const s = stringsFor(lang) as unknown as Record<string, string>;
      expect(Object.keys(s).sort(), lang).toEqual(keys);
      for (const k of keys) expect(s[k].trim(), `${lang}.${k}`).not.toBe("");
    }
  });
  it("falls back to English for unknown languages", () => {
    expect(stringsFor("Klingon")).toBe(stringsFor("English"));
    expect(dirFor("Klingon")).toBe("ltr");
    expect(htmlLangFor("Klingon")).toBe("en");
  });
  it("marks Arabic and Persian as right-to-left only", () => {
    expect(LANGUAGES.filter((l) => dirFor(l) === "rtl")).toEqual(["Arabic", "Persian"]);
  });
  it("gives each language its own html lang", () => {
    expect(new Set(LANGUAGES.map(htmlLangFor)).size).toBe(LANGUAGES.length);
    expect(htmlLangFor("Einfache Sprache (simple German)")).toBe("de");
  });
  it("keeps the emergency number visible in every language", () => {
    for (const lang of LANGUAGES) expect(stringsFor(lang).emergencyTitle, lang).toContain("112");
  });
});
```

- [ ] **Step 2: Run it** — `npx vitest run src/i18n` → FAIL (module missing).

- [ ] **Step 3: Implement** — `frontend/src/i18n/handout.ts`. Header comment:
`// Fixed text on the patient handout and guide. Needs native-speaker and clinical review before real use.`
`// Keys of STRINGS must equal the backend's medical target_languages (backend/app/domains/medical_document/__init__.py).`

```ts
export const LANGUAGES = [
  "Einfache Sprache (simple German)", "English", "Turkish", "Arabic", "Russian", "Ukrainian",
  "Polish", "Romanian", "Persian", "Spanish", "French", "Simplified Chinese",
] as const;
export type HandoutLanguage = (typeof LANGUAGES)[number];

export interface HandoutStrings {
  title1: string; title2: string; madeWith: string; name: string; admitted: string; discharged: string;
  why: string; diagnoses: string; actions: string; medicines: string; medicine: string; purpose: string;
  morning: string; noon: string; evening: string; night: string; boxName: string; tagNew: string;
  tagChanged: string; stopTaking: string; help: string; emergencyTitle: string; emergencyText: string;
  generalAdvice: string; noWarningSigns: string; checkup: string; instructions: string; contacts: string;
  discussedWith: string; date: string; disclaimer: string; continued: string; overview: string;
  details: string; myDay: string; otherTimes: string; readAloud: string; stopReading: string;
  textSize: string; sizeStandard: string; sizeLarge: string; sizeXL: string; allWarningSigns: string;
}

const HTML_LANG: Record<HandoutLanguage, string> = {
  "Einfache Sprache (simple German)": "de", English: "en", Turkish: "tr", Arabic: "ar", Russian: "ru",
  Ukrainian: "uk", Polish: "pl", Romanian: "ro", Persian: "fa", Spanish: "es", French: "fr",
  "Simplified Chinese": "zh-Hans",
};
const RTL = new Set<string>(["Arabic", "Persian"]);

const isKnown = (l: string): l is HandoutLanguage => (LANGUAGES as readonly string[]).includes(l);
export const stringsFor = (l: string): HandoutStrings => STRINGS[isKnown(l) ? l : "English"];
export const dirFor = (l: string): "ltr" | "rtl" => (RTL.has(l) ? "rtl" : "ltr");
export const htmlLangFor = (l: string): string => (isKnown(l) ? HTML_LANG[l] : "en");
```

`const STRINGS: Record<HandoutLanguage, HandoutStrings>` with these exact values (key order as in the interface):

| key | English | Einfache Sprache (simple German) |
|---|---|---|
| title1 | Your hospital stay and what to do now | Ihr Aufenthalt im Krankenhaus und was Sie jetzt tun |
| title2 | Help, check-up and contacts | Hilfe, Kontrolle und Kontakte |
| madeWith | Made with BefundVerstehen | Erstellt mit BefundVerstehen |
| name | Name | Name |
| admitted | Admitted | Aufnahme |
| discharged | Discharged | Entlassung |
| why | Why you were in hospital | Warum Sie im Krankenhaus waren |
| diagnoses | Your diagnoses | Ihre Diagnosen |
| actions | What to do now | Was Sie jetzt tun |
| medicines | Your medicines | Ihre Medikamente |
| medicine | Medicine | Medikament |
| purpose | What it is for | Wofür es ist |
| morning / noon / evening / night | Morning / Noon / Evening / Night | Morgens / Mittags / Abends / Nachts |
| boxName | Name on the box | Name auf der Packung |
| tagNew / tagChanged | New / Changed | Neu / Geändert |
| stopTaking | Stop taking these medicines | Diese Medikamente nicht mehr nehmen |
| help | When to get help | Wann Sie Hilfe holen |
| emergencyTitle | Emergency: call 112 | Notfall: 112 anrufen |
| emergencyText | Call 112 at once if you have chest pain or pressure, sudden severe shortness of breath, signs of a stroke, or if you faint. | Rufen Sie sofort die 112 an bei: Schmerzen oder Druck in der Brust. Plötzlicher starker Atemnot. Zeichen für einen Schlaganfall. Ohnmacht. |
| generalAdvice | General advice — not from your letter | Allgemeiner Rat — nicht aus Ihrem Brief |
| noWarningSigns | Your letter does not list warning signs. Ask your doctor which signs to watch for. | In Ihrem Brief stehen keine Warnzeichen. Fragen Sie Ihre Ärztin oder Ihren Arzt, worauf Sie achten sollen. |
| checkup | Check-up | Kontrolle |
| instructions | Other instructions | Weitere Hinweise |
| contacts | Contacts | Kontakte |
| discussedWith | Discussed with | Besprochen mit |
| date | Date | Datum |
| disclaimer | This handout does not replace instructions from your care team. | Dieses Blatt ersetzt nicht die Anweisungen Ihres Behandlungsteams. |
| continued | continued | Fortsetzung |
| overview / details | Overview / Details | Überblick / Details |
| myDay | My day | Mein Tag |
| otherTimes | Not every day | Nicht jeden Tag |
| readAloud / stopReading | Read aloud / Stop reading | Vorlesen / Vorlesen stoppen |
| textSize | Text size | Schriftgröße |
| sizeStandard / sizeLarge / sizeXL | Standard / Large / Extra large | Normal / Groß / Sehr groß |
| allWarningSigns | See all warning signs and contacts | Alle Warnzeichen und Kontakte ansehen |

Turkish: title1 "Hastanede kalışınız ve şimdi yapmanız gerekenler" · title2 "Yardım, kontrol ve iletişim" · madeWith "BefundVerstehen ile hazırlandı" · name "Ad" · admitted "Yatış" · discharged "Taburcu" · why "Neden hastanedeydiniz" · diagnoses "Tanılarınız" · actions "Şimdi yapmanız gerekenler" · medicines "İlaçlarınız" · medicine "İlaç" · purpose "Ne için" · morning "Sabah" · noon "Öğle" · evening "Akşam" · night "Gece" · boxName "Kutudaki adı" · tagNew "Yeni" · tagChanged "Değişti" · stopTaking "Bu ilaçları artık almayın" · help "Ne zaman yardım almalısınız" · emergencyTitle "Acil durum: 112'yi arayın" · emergencyText "Göğüs ağrısı veya baskısı, aniden şiddetli nefes darlığı, inme belirtileri olursa ya da bayılırsanız hemen 112'yi arayın." · generalAdvice "Genel tavsiye — mektubunuzdan değil" · noWarningSigns "Mektubunuzda uyarı işaretleri yazmıyor. Neye dikkat etmeniz gerektiğini doktorunuza sorun." · checkup "Kontrol" · instructions "Diğer talimatlar" · contacts "İletişim" · discussedWith "Görüşülen kişi" · date "Tarih" · disclaimer "Bu bilgi notu, tedavi ekibinizin talimatlarının yerini tutmaz." · continued "devamı" · overview "Genel bakış" · details "Ayrıntılar" · myDay "Günüm" · otherTimes "Her gün değil" · readAloud "Sesli oku" · stopReading "Okumayı durdur" · textSize "Yazı boyutu" · sizeStandard "Standart" · sizeLarge "Büyük" · sizeXL "Çok büyük" · allWarningSigns "Tüm uyarı işaretlerini ve iletişim bilgilerini görün"

Arabic: title1 "إقامتك في المستشفى وما عليك فعله الآن" · title2 "المساعدة والمتابعة وجهات الاتصال" · madeWith "أُعدّ باستخدام BefundVerstehen" · name "الاسم" · admitted "تاريخ الدخول" · discharged "تاريخ الخروج" · why "لماذا كنت في المستشفى" · diagnoses "تشخيصاتك" · actions "ما عليك فعله الآن" · medicines "أدويتك" · medicine "الدواء" · purpose "لماذا تأخذه" · morning "صباحًا" · noon "ظهرًا" · evening "مساءً" · night "ليلًا" · boxName "الاسم على العلبة" · tagNew "جديد" · tagChanged "تغيّر" · stopTaking "توقّف عن تناول هذه الأدوية" · help "متى تطلب المساعدة" · emergencyTitle "حالة طارئة: اتصل بالرقم 112" · emergencyText "اتصل فورًا بالرقم 112 إذا شعرت بألم أو ضغط في الصدر، أو ضيق شديد ومفاجئ في التنفس، أو علامات سكتة دماغية، أو إذا أُغمي عليك." · generalAdvice "نصيحة عامة — ليست من رسالتك" · noWarningSigns "لا تذكر رسالتك علامات تحذيرية. اسأل طبيبك عن العلامات التي يجب أن تنتبه لها." · checkup "موعد المتابعة" · instructions "تعليمات أخرى" · contacts "جهات الاتصال" · discussedWith "تمت المناقشة مع" · date "التاريخ" · disclaimer "هذه الورقة لا تحلّ محلّ تعليمات فريق الرعاية الخاص بك." · continued "تابع" · overview "نظرة عامة" · details "التفاصيل" · myDay "يومي" · otherTimes "ليس كل يوم" · readAloud "اقرأ بصوت عالٍ" · stopReading "أوقف القراءة" · textSize "حجم الخط" · sizeStandard "عادي" · sizeLarge "كبير" · sizeXL "كبير جدًا" · allWarningSigns "اعرض كل العلامات التحذيرية وجهات الاتصال"

Russian: title1 "Ваше пребывание в больнице и что делать сейчас" · title2 "Помощь, контрольный осмотр и контакты" · madeWith "Подготовлено с помощью BefundVerstehen" · name "Имя" · admitted "Поступление" · discharged "Выписка" · why "Почему вы были в больнице" · diagnoses "Ваши диагнозы" · actions "Что делать сейчас" · medicines "Ваши лекарства" · medicine "Лекарство" · purpose "Для чего" · morning "Утро" · noon "День" · evening "Вечер" · night "Ночь" · boxName "Название на упаковке" · tagNew "Новое" · tagChanged "Изменено" · stopTaking "Больше не принимайте эти лекарства" · help "Когда обращаться за помощью" · emergencyTitle "Экстренный случай: звоните 112" · emergencyText "Сразу звоните 112, если у вас боль или давление в груди, внезапная сильная одышка, признаки инсульта или вы потеряли сознание." · generalAdvice "Общий совет — не из вашего письма" · noWarningSigns "В вашем письме нет тревожных признаков. Спросите врача, на что обращать внимание." · checkup "Контрольный осмотр" · instructions "Другие указания" · contacts "Контакты" · discussedWith "Обсуждено с" · date "Дата" · disclaimer "Этот листок не заменяет указаний вашей медицинской команды." · continued "продолжение" · overview "Обзор" · details "Подробно" · myDay "Мой день" · otherTimes "Не каждый день" · readAloud "Читать вслух" · stopReading "Остановить чтение" · textSize "Размер текста" · sizeStandard "Обычный" · sizeLarge "Крупный" · sizeXL "Очень крупный" · allWarningSigns "Все тревожные признаки и контакты"

Ukrainian: title1 "Ваше перебування в лікарні та що робити зараз" · title2 "Допомога, контрольний огляд і контакти" · madeWith "Підготовлено за допомогою BefundVerstehen" · name "Ім'я" · admitted "Госпіталізація" · discharged "Виписка" · why "Чому ви були в лікарні" · diagnoses "Ваші діагнози" · actions "Що робити зараз" · medicines "Ваші ліки" · medicine "Ліки" · purpose "Для чого" · morning "Ранок" · noon "Обід" · evening "Вечір" · night "Ніч" · boxName "Назва на упаковці" · tagNew "Нове" · tagChanged "Змінено" · stopTaking "Більше не приймайте ці ліки" · help "Коли звертатися по допомогу" · emergencyTitle "Невідкладний випадок: телефонуйте 112" · emergencyText "Негайно телефонуйте 112, якщо у вас біль або тиск у грудях, раптова сильна задишка, ознаки інсульту або ви знепритомніли." · generalAdvice "Загальна порада — не з вашого листа" · noWarningSigns "У вашому листі немає тривожних ознак. Запитайте лікаря, на що звертати увагу." · checkup "Контрольний огляд" · instructions "Інші вказівки" · contacts "Контакти" · discussedWith "Обговорено з" · date "Дата" · disclaimer "Цей листок не замінює вказівок вашої медичної команди." · continued "продовження" · overview "Огляд" · details "Докладно" · myDay "Мій день" · otherTimes "Не щодня" · readAloud "Читати вголос" · stopReading "Зупинити читання" · textSize "Розмір тексту" · sizeStandard "Звичайний" · sizeLarge "Великий" · sizeXL "Дуже великий" · allWarningSigns "Усі тривожні ознаки та контакти"

Polish: title1 "Twój pobyt w szpitalu i co robić teraz" · title2 "Pomoc, wizyta kontrolna i kontakty" · madeWith "Przygotowano w BefundVerstehen" · name "Imię i nazwisko" · admitted "Przyjęcie" · discharged "Wypis" · why "Powód pobytu w szpitalu" · diagnoses "Twoje diagnozy" · actions "Co robić teraz" · medicines "Twoje leki" · medicine "Lek" · purpose "Na co jest" · morning "Rano" · noon "Południe" · evening "Wieczór" · night "Noc" · boxName "Nazwa na opakowaniu" · tagNew "Nowy" · tagChanged "Zmieniony" · stopTaking "Przestań brać te leki" · help "Kiedy szukać pomocy" · emergencyTitle "Nagły wypadek: dzwoń pod 112" · emergencyText "Natychmiast dzwoń pod 112, jeśli masz ból lub ucisk w klatce piersiowej, nagłą silną duszność, objawy udaru albo zemdlejesz." · generalAdvice "Ogólna porada — nie z Twojego listu" · noWarningSigns "Twój list nie wymienia objawów alarmowych. Zapytaj lekarza, na co zwracać uwagę." · checkup "Wizyta kontrolna" · instructions "Inne zalecenia" · contacts "Kontakty" · discussedWith "Omówiono z" · date "Data" · disclaimer "Ta kartka nie zastępuje zaleceń Twojego zespołu leczącego." · continued "ciąg dalszy" · overview "Przegląd" · details "Szczegóły" · myDay "Mój dzień" · otherTimes "Nie codziennie" · readAloud "Czytaj na głos" · stopReading "Zatrzymaj czytanie" · textSize "Rozmiar tekstu" · sizeStandard "Standardowy" · sizeLarge "Duży" · sizeXL "Bardzo duży" · allWarningSigns "Zobacz wszystkie objawy alarmowe i kontakty"

Romanian: title1 "Șederea în spital și ce trebuie să faceți acum" · title2 "Ajutor, control și contacte" · madeWith "Realizat cu BefundVerstehen" · name "Nume" · admitted "Internare" · discharged "Externare" · why "De ce ați fost în spital" · diagnoses "Diagnosticele dumneavoastră" · actions "Ce trebuie să faceți acum" · medicines "Medicamentele dumneavoastră" · medicine "Medicament" · purpose "Pentru ce este" · morning "Dimineața" · noon "La prânz" · evening "Seara" · night "Noaptea" · boxName "Numele de pe cutie" · tagNew "Nou" · tagChanged "Modificat" · stopTaking "Nu mai luați aceste medicamente" · help "Când să cereți ajutor" · emergencyTitle "Urgență: sunați la 112" · emergencyText "Sunați imediat la 112 dacă aveți durere sau apăsare în piept, lipsă de aer bruscă și puternică, semne de accident vascular cerebral sau dacă leșinați." · generalAdvice "Sfat general — nu din scrisoarea dumneavoastră" · noWarningSigns "Scrisoarea dumneavoastră nu enumeră semne de alarmă. Întrebați medicul la ce să fiți atent." · checkup "Control" · instructions "Alte instrucțiuni" · contacts "Contacte" · discussedWith "Discutat cu" · date "Data" · disclaimer "Această fișă nu înlocuiește instrucțiunile echipei care vă îngrijește." · continued "continuare" · overview "Prezentare generală" · details "Detalii" · myDay "Ziua mea" · otherTimes "Nu în fiecare zi" · readAloud "Citește cu voce tare" · stopReading "Oprește citirea" · textSize "Mărimea textului" · sizeStandard "Standard" · sizeLarge "Mare" · sizeXL "Foarte mare" · allWarningSigns "Vedeți toate semnele de alarmă și contactele"

Persian: title1 "بستری شما در بیمارستان و کارهایی که اکنون باید انجام دهید" · title2 "کمک، معاینهٔ پیگیری و تماس‌ها" · madeWith "تهیه‌شده با BefundVerstehen" · name "نام" · admitted "تاریخ بستری" · discharged "تاریخ ترخیص" · why "چرا در بیمارستان بودید" · diagnoses "تشخیص‌های شما" · actions "کارهایی که اکنون باید انجام دهید" · medicines "داروهای شما" · medicine "دارو" · purpose "برای چیست" · morning "صبح" · noon "ظهر" · evening "عصر" · night "شب" · boxName "نام روی جعبه" · tagNew "جدید" · tagChanged "تغییر کرده" · stopTaking "این داروها را دیگر مصرف نکنید" · help "چه زمانی کمک بگیرید" · emergencyTitle "اورژانس: با 112 تماس بگیرید" · emergencyText "اگر درد یا فشار در قفسهٔ سینه، تنگی نفس شدید و ناگهانی یا نشانه‌های سکتهٔ مغزی دارید، یا بیهوش شدید، فوراً با 112 تماس بگیرید." · generalAdvice "توصیهٔ کلی — نه از نامهٔ شما" · noWarningSigns "در نامهٔ شما علائم هشدار ذکر نشده است. از پزشک خود بپرسید به چه علائمی توجه کنید." · checkup "معاینهٔ پیگیری" · instructions "دستورهای دیگر" · contacts "تماس‌ها" · discussedWith "گفت‌وگو شد با" · date "تاریخ" · disclaimer "این برگه جایگزین دستورهای تیم درمان شما نیست." · continued "ادامه" · overview "نمای کلی" · details "جزئیات" · myDay "روز من" · otherTimes "نه هر روز" · readAloud "بلند خواندن" · stopReading "توقف خواندن" · textSize "اندازهٔ متن" · sizeStandard "معمولی" · sizeLarge "بزرگ" · sizeXL "خیلی بزرگ" · allWarningSigns "همهٔ علائم هشدار و تماس‌ها را ببینید"

Spanish: title1 "Su estancia en el hospital y qué hacer ahora" · title2 "Ayuda, revisión y contactos" · madeWith "Hecho con BefundVerstehen" · name "Nombre" · admitted "Ingreso" · discharged "Alta" · why "Por qué estuvo en el hospital" · diagnoses "Sus diagnósticos" · actions "Qué hacer ahora" · medicines "Sus medicamentos" · medicine "Medicamento" · purpose "Para qué sirve" · morning "Mañana" · noon "Mediodía" · evening "Tarde" · night "Noche" · boxName "Nombre en la caja" · tagNew "Nuevo" · tagChanged "Cambiado" · stopTaking "Deje de tomar estos medicamentos" · help "Cuándo pedir ayuda" · emergencyTitle "Emergencia: llame al 112" · emergencyText "Llame al 112 de inmediato si tiene dolor u opresión en el pecho, falta de aire fuerte y repentina, signos de un ictus o si se desmaya." · generalAdvice "Consejo general — no de su carta" · noWarningSigns "Su carta no menciona señales de alarma. Pregunte a su médico a qué debe prestar atención." · checkup "Revisión" · instructions "Otras indicaciones" · contacts "Contactos" · discussedWith "Comentado con" · date "Fecha" · disclaimer "Esta hoja no sustituye las indicaciones de su equipo médico." · continued "continuación" · overview "Resumen" · details "Detalles" · myDay "Mi día" · otherTimes "No todos los días" · readAloud "Leer en voz alta" · stopReading "Dejar de leer" · textSize "Tamaño del texto" · sizeStandard "Normal" · sizeLarge "Grande" · sizeXL "Muy grande" · allWarningSigns "Ver todas las señales de alarma y contactos"

French: title1 "Votre séjour à l'hôpital et ce qu'il faut faire maintenant" · title2 "Aide, contrôle et contacts" · madeWith "Réalisé avec BefundVerstehen" · name "Nom" · admitted "Admission" · discharged "Sortie" · why "Pourquoi vous étiez à l'hôpital" · diagnoses "Vos diagnostics" · actions "Ce qu'il faut faire maintenant" · medicines "Vos médicaments" · medicine "Médicament" · purpose "À quoi il sert" · morning "Matin" · noon "Midi" · evening "Soir" · night "Nuit" · boxName "Nom sur la boîte" · tagNew "Nouveau" · tagChanged "Modifié" · stopTaking "Arrêtez de prendre ces médicaments" · help "Quand demander de l'aide" · emergencyTitle "Urgence : appelez le 112" · emergencyText "Appelez immédiatement le 112 en cas de douleur ou d'oppression dans la poitrine, d'essoufflement soudain et intense, de signes d'AVC ou si vous perdez connaissance." · generalAdvice "Conseil général — ne vient pas de votre lettre" · noWarningSigns "Votre lettre n'indique pas de signes d'alerte. Demandez à votre médecin à quoi faire attention." · checkup "Contrôle" · instructions "Autres consignes" · contacts "Contacts" · discussedWith "Discuté avec" · date "Date" · disclaimer "Cette fiche ne remplace pas les consignes de votre équipe soignante." · continued "suite" · overview "Vue d'ensemble" · details "Détails" · myDay "Ma journée" · otherTimes "Pas tous les jours" · readAloud "Lire à voix haute" · stopReading "Arrêter la lecture" · textSize "Taille du texte" · sizeStandard "Standard" · sizeLarge "Grand" · sizeXL "Très grand" · allWarningSigns "Voir tous les signes d'alerte et contacts"

Simplified Chinese: title1 "您的住院情况和现在要做的事" · title2 "求助、复查和联系方式" · madeWith "由 BefundVerstehen 制作" · name "姓名" · admitted "入院" · discharged "出院" · why "您为什么住院" · diagnoses "您的诊断" · actions "现在要做的事" · medicines "您的药物" · medicine "药物" · purpose "用途" · morning "早上" · noon "中午" · evening "晚上" · night "睡前" · boxName "包装上的名称" · tagNew "新" · tagChanged "已更改" · stopTaking "停止服用这些药物" · help "何时求助" · emergencyTitle "紧急情况：拨打 112" · emergencyText "如果出现胸痛或胸闷、突然严重呼吸困难、中风迹象或昏倒，请立即拨打 112。" · generalAdvice "一般建议——并非来自您的信" · noWarningSigns "您的信中没有列出警示症状。请询问医生应注意哪些症状。" · checkup "复查" · instructions "其他说明" · contacts "联系方式" · discussedWith "讲解人" · date "日期" · disclaimer "本说明不能代替您的医护团队的指示。" · continued "续" · overview "概览" · details "详情" · myDay "我的一天" · otherTimes "非每日" · readAloud "朗读" · stopReading "停止朗读" · textSize "文字大小" · sizeStandard "标准" · sizeLarge "大" · sizeXL "特大" · allWarningSigns "查看所有警示症状和联系方式"

- [ ] **Step 4: Run** — `npx vitest run src/i18n` → PASS.
- [ ] **Step 5: Commit** — `git add frontend/src/i18n && git commit -m "feat(frontend): handout strings in the 12 medical languages"`

---

### Task 3: Handout model (`buildHandout`)

**Files:**
- Create: `frontend/src/features/handout/model.ts`
- Test: `frontend/src/features/handout/model.test.ts`

**Interfaces:**
- Consumes: `stringsFor`, `dirFor`, `htmlLangFor`, `HandoutStrings` (Task 2); `AnalysisResult`, `KeyItem`, `Medication` from `api/types`.
- Produces (used by Tasks 7, 8, 9):

```ts
export type Slot = "morning" | "noon" | "evening" | "night";
export const SLOTS: readonly Slot[];
export type PrintSize = "normal" | "large";
export interface HandoutSettings { size: PrintSize; showActions: boolean; showCheckup: boolean }
export const DEFAULT_SETTINGS: HandoutSettings; // { size: "large", showActions: true, showCheckup: true }
export interface HandoutItem { id: string; title: string; value: string; text: string; lowConfidence: boolean }
export interface HandoutMedicine {
  id: string; title: string; boxName: string; purpose: string | null;
  doses: Record<Slot, string | null>; notes: string[]; tag: "new" | "changed" | null; lowConfidence: boolean;
}
export interface HandoutModel {
  t: HandoutStrings; language: string; dir: "ltr" | "rtl"; htmlLang: string; settings: HandoutSettings;
  hospital: string | null; summary: string; diagnoses: HandoutItem[]; actions: string[];
  slots: Slot[]; medicines: HandoutMedicine[]; stopped: HandoutMedicine[];
  warningSigns: HandoutItem[]; checkups: HandoutItem[]; instructions: HandoutItem[]; contacts: HandoutItem[];
}
export function buildHandout(result: AnalysisResult, settings?: HandoutSettings): HandoutModel;
```
Rules: `language = result.target_language` (never the requested language). A dose counts only if non-null, non-blank and not `"0"` (trimmed); otherwise `null`. `slots` = SLOTS used by at least one non-stopped medicine. `title = active_ingredient?.trim() || name`; `boxName = [name, strength].filter(Boolean).join(" ")`; `notes = [instructions, schedule_text]` non-empty trimmed. `tag`: status `new` → "new", `changed` → "changed", else null. `stopped` = status `stopped`; `medicines` = all others in document order. Key items map by kind (`diagnosis`, `warning_sign`, `appointment` → checkups, `instruction`, `contact`) to `{ id, title: label, value, text: explanation, lowConfidence: confidence === "low" }`. `actions = settings.showActions ? action_steps : []`; `checkups = settings.showCheckup ? … : []`.

- [ ] **Step 1: Write the failing test** — `frontend/src/features/handout/model.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { loadSample } from "../../test/samples";
import { stringsFor } from "../../i18n/handout";
import { DEFAULT_SETTINGS, buildHandout } from "./model";

describe("buildHandout — discharge letter sample", () => {
  const m = buildHandout(loadSample("entlassbrief"));
  it("uses only the time columns that are used", () => expect(m.slots).toEqual(["morning", "evening"]));
  it("separates stopped medicines", () => {
    expect(m.stopped.map((x) => x.boxName)).toEqual(["Metformin 1000 mg"]);
    expect(m.medicines.map((x) => x.boxName)).toEqual(["Ramipril 5 mg", "Amlodipin 5 mg", "Cefuroxim 500 mg"]);
  });
  it("turns '0' into an empty cell and keeps printed doses", () => {
    const amlo = m.medicines[1];
    expect(amlo.doses).toEqual({ morning: "1", noon: null, evening: null, night: null });
  });
  it("tags new medicines and keeps schedule text as a note", () => {
    expect(m.medicines[1].tag).toBe("new");
    expect(m.medicines[0].tag).toBeNull();
    expect(m.medicines[2].notes).toContain("bis einschließlich 12.10.2026");
  });
  it("sorts key items into sections", () => {
    expect(m.diagnoses).toHaveLength(3);
    expect(m.warningSigns).toHaveLength(1);
    expect(m.checkups).toHaveLength(1);
    expect(m.instructions).toHaveLength(2);
    expect(m.contacts).toHaveLength(1);
    expect(m.actions.length).toBeGreaterThan(0);
    expect(m.hospital).toBe("Klinikum Musterstadt, Department of Internal Medicine");
  });
  it("follows the result's language, not the requested one (Review Focus 1)", () => {
    expect(m.language).toBe("English");
    expect(m.t).toBe(stringsFor("English"));
    expect(m.dir).toBe("ltr");
  });
});

describe("buildHandout — medication plan sample", () => {
  const m = buildHandout(loadSample("medikationsplan"));
  it("keeps medicines without a daily dose, with their schedule note (Review Focus 2)", () => {
    const mtx = m.medicines.find((x) => x.boxName.startsWith("Methotrexat"))!;
    expect(mtx.doses).toEqual({ morning: null, noon: null, evening: null, night: null });
    expect(mtx.notes).toContain("1x wöchentlich montags");
  });
  it("keeps fractional doses", () => {
    expect(m.medicines.find((x) => x.boxName.startsWith("Metformin"))!.doses.morning).toBe("½");
  });
  it("leaves empty categories empty (Review Focus 3)", () => {
    expect(m.diagnoses).toEqual([]);
    expect(m.warningSigns).toEqual([]);
    expect(m.stopped).toEqual([]);
  });
});

describe("buildHandout — settings and edge cases", () => {
  it("drops switched-off sections", () => {
    const m = buildHandout(loadSample("entlassbrief"), { ...DEFAULT_SETTINGS, showActions: false, showCheckup: false });
    expect(m.actions).toEqual([]);
    expect(m.checkups).toEqual([]);
  });
  it("switches to right-to-left for Arabic results", () => {
    const r = { ...loadSample("entlassbrief"), target_language: "Arabic" };
    const m = buildHandout(r);
    expect(m.dir).toBe("rtl");
    expect(m.htmlLang).toBe("ar");
    expect(m.t.why).toBe(stringsFor("Arabic").why);
  });
  it("flags low-confidence items and copes with a missing sender", () => {
    const r = loadSample("entlassbrief");
    r.sender = null;
    r.medications[0].confidence = "low";
    r.key_items[0].confidence = "low";
    const m = buildHandout(r);
    expect(m.hospital).toBeNull();
    expect(m.medicines[0].lowConfidence).toBe(true);
    expect(m.diagnoses[0].lowConfidence).toBe(true);
  });
});
```

- [ ] **Step 2: Run** — `npx vitest run src/features/handout/model.test.ts` → FAIL.
- [ ] **Step 3: Implement** `model.ts` exactly to the interface and rules above (pure; no React imports).
- [ ] **Step 4: Run** → PASS; then `npm run build`.
- [ ] **Step 5: Commit** — `git commit -m "feat(frontend): build the handout model from an analysis"`

---

### Task 4: Sheet pagination (`paginate`)

**Files:**
- Create: `frontend/src/features/handout/paginate.ts`
- Test: `frontend/src/features/handout/paginate.test.ts`

**Interfaces:**
- Produces (used by Task 7):

```ts
export interface FlowBlock {
  height: number;               // px, measured
  breakBefore?: boolean;        // always start a new sheet (unless the current sheet is empty)
  keepWithNext?: boolean;       // never leave this block last on a sheet (headings)
  group?: string;               // blocks of one table share a group
  continuationHeight?: number;  // px of the "(continued)" header drawn when a group resumes on a new sheet
}
export interface Pagination { sheets: number[][]; continued: boolean[]; overflowing: number[] }
export function paginate(blocks: FlowBlock[], pageHeight: number): Pagination;
export const SHEET_MM = { width: 210, height: 297, marginX: 16, marginY: 14 } as const;
export const mmToPx: (mm: number) => number;           // mm * 96 / 25.4
export const SHEET_CONTENT_HEIGHT_PX: number;          // mmToPx(297 - 2 * 14)
```

- [ ] **Step 1: Write the failing test** — `paginate.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { mmToPx, paginate } from "./paginate";

const b = (height: number, extra = {}) => ({ height, ...extra });

describe("paginate", () => {
  it("keeps everything on one sheet when it fits", () => {
    expect(paginate([b(100), b(100)], 300)).toEqual({ sheets: [[0, 1]], continued: [false], overflowing: [] });
  });
  it("starts a new sheet when the next block does not fit", () => {
    expect(paginate([b(200), b(200)], 300).sheets).toEqual([[0], [1]]);
  });
  it("honours breakBefore, except on an empty sheet", () => {
    expect(paginate([b(10, { breakBefore: true }), b(10, { breakBefore: true })], 300).sheets).toEqual([[0], [1]]);
  });
  it("moves a heading with the block after it", () => {
    expect(paginate([b(200), b(50, { keepWithNext: true }), b(100)], 300).sheets).toEqual([[0], [1, 2]]);
  });
  it("marks a resumed group and counts its continuation header", () => {
    const blocks = [b(250, { group: "meds" }), b(40, { group: "meds", continuationHeight: 30 }), b(240, { group: "meds", continuationHeight: 30 })];
    const p = paginate(blocks, 300);
    expect(p.sheets).toEqual([[0, 1], [2]]);
    expect(p.continued).toEqual([false, true]);
    expect(p.overflowing).toEqual([]);
  });
  it("puts an over-tall block alone and flags it (Review Focus 4)", () => {
    const p = paginate([b(100), b(900), b(100)], 300);
    expect(p.sheets).toEqual([[0], [1], [2]]);
    expect(p.overflowing).toEqual([1]);
  });
  it("converts millimetres at 96 dpi", () => expect(Math.round(mmToPx(25.4))).toBe(96));
});
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement**

```ts
export const SHEET_MM = { width: 210, height: 297, marginX: 16, marginY: 14 } as const;
export const mmToPx = (mm: number) => (mm * 96) / 25.4;
export const SHEET_CONTENT_HEIGHT_PX = mmToPx(SHEET_MM.height - 2 * SHEET_MM.marginY);

export function paginate(blocks: FlowBlock[], pageHeight: number): Pagination {
  const sheets: number[][] = [[]];
  const continued = [false];
  const used = [0];
  blocks.forEach((block, i) => {
    const cur = sheets.length - 1;
    const next = blocks[i + 1];
    const need = block.height + (block.keepWithNext && next ? next.height : 0);
    if (sheets[cur].length > 0 && (block.breakBefore || used[cur] + need > pageHeight)) {
      const resumes = !block.breakBefore && !!block.group && blocks[i - 1]?.group === block.group;
      sheets.push([]);
      continued.push(resumes);
      used.push(resumes ? (block.continuationHeight ?? 0) : 0);
    }
    const s = sheets.length - 1;
    sheets[s].push(i);
    used[s] += block.height;
  });
  return { sheets, continued, overflowing: used.flatMap((u, i) => (u > pageHeight ? [i] : [])) };
}
```
(Include the `FlowBlock` and `Pagination` interfaces from the Interfaces block.)

- [ ] **Step 4: Run** → PASS; `npm run build`.
- [ ] **Step 5: Commit** — `git commit -m "feat(frontend): paginate handout blocks onto A4 sheets"`

---

### Task 5: Screen state and `useAnalysis` changes

**Files:**
- Create: `frontend/src/features/analysis/screen.ts`
- Modify: `frontend/src/features/analysis/useAnalysis.ts`, `frontend/src/App.tsx` (remove the document-type select only)
- Test: `frontend/src/features/analysis/screen.test.ts`

**Interfaces:**
- Produces:

```ts
// screen.ts
export type Status = "idle" | "preparing" | "analyzing" | "done";
export type Screen = "start" | "processing" | "read-error" | "workspace";
export function screenFor(status: Status, response: AnalyzeResponse | null): Screen;
export function statusAfterCancel(hasResponse: boolean): Status;   // "done" if a result exists, else "idle"
export function needsAttention(response: AnalyzeResponse): boolean; // critical findings, poor image or a confidence_note
export const PROFILE = "medical_document";
export const DEFAULT_LANGUAGE = "Einfache Sprache (simple German)";
```
- `useAnalysis()` return value after this task (Tasks 6 and 9 use it via `type Analysis = ReturnType<typeof useAnalysis>`, exported from `useAnalysis.ts`):
  `meta, domain, languages, needsConsent, consent, setConsent, ui, samples, pages, status, error, response, verifications, ocrState, coverage, targetLanguage, setTargetLanguage, addFiles, trySample, removePage, movePage, analyze, reanalyze, cancel, backToStart, reset`
  - `analyze(): Promise<void>` — no parameters (safe as `onClick={() => a.analyze()}`; never pass it directly as an event handler).
  - `reanalyze(language: string): Promise<void>` — sets `targetLanguage` and runs the analysis with that language.
  - `cancel(): void` — aborts the request; `status = statusAfterCancel(response !== null)`; pages and response kept.
  - `backToStart(): void` — clears response, verifications and coverage; keeps pages; `status = "idle"`.
  - Removed: `activeProfile`, `switchProfile`.
  - `Status` is re-exported from `screen.ts` (`export type { Status } from "./screen"`).

- [ ] **Step 1: Write the failing test** — `screen.test.ts`

```ts
import { describe, expect, it } from "vitest";
import type { AnalyzeResponse } from "../../api/types";
import { loadSample } from "../../test/samples";
import { needsAttention, screenFor, statusAfterCancel } from "./screen";

function response(over: Partial<AnalyzeResponse["result"]> = {}, critical = 0): AnalyzeResponse {
  return {
    result: { ...loadSample("entlassbrief"), ...over },
    checks: {
      document_class: { id: "x", label: "x", lineage: [], source: "x" },
      findings: [], item_checks: {}, escalation: null, scam_suspected: false, readability: null,
      summary: { total_items: 1, grounded_items: 1, critical, warnings: 0, infos: 0 },
    },
    analyzer: "mock", profile: "medical_document", page_count: 1,
  };
}

describe("screenFor", () => {
  it("shows the start screen without a result", () => {
    expect(screenFor("idle", null)).toBe("start");
    expect(screenFor("preparing", null)).toBe("start");
  });
  it("shows processing while analysing, even over an old result", () => {
    expect(screenFor("analyzing", null)).toBe("processing");
    expect(screenFor("analyzing", response())).toBe("processing");
  });
  it("shows the read error for unreadable images", () => {
    expect(screenFor("done", response({ image_quality: "unreadable" }))).toBe("read-error");
  });
  it("keeps the old workspace after a failed re-analysis (Review Focus 5)", () => {
    expect(screenFor("idle", response())).toBe("workspace");
  });
});

describe("statusAfterCancel (Review Focus 5)", () => {
  it("returns to the workspace when a result exists", () => expect(statusAfterCancel(true)).toBe("done"));
  it("returns to the start screen otherwise", () => expect(statusAfterCancel(false)).toBe("idle"));
});

describe("needsAttention", () => {
  it("is quiet for a clean result", () => expect(needsAttention(response())).toBe(false));
  it("flags critical findings, poor images and confidence notes", () => {
    expect(needsAttention(response({}, 1))).toBe(true);
    expect(needsAttention(response({ image_quality: "poor" }))).toBe(true);
    expect(needsAttention(response({ confidence_note: "Page 2 is blurry." }))).toBe(true);
  });
});
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement `screen.ts`**

```ts
import type { AnalyzeResponse } from "../../api/types";

export type Status = "idle" | "preparing" | "analyzing" | "done";
export type Screen = "start" | "processing" | "read-error" | "workspace";
export const PROFILE = "medical_document";
export const DEFAULT_LANGUAGE = "Einfache Sprache (simple German)";

export function screenFor(status: Status, response: AnalyzeResponse | null): Screen {
  if (status === "analyzing") return "processing";
  if (!response) return "start";
  return response.result.image_quality === "unreadable" ? "read-error" : "workspace";
}

export const statusAfterCancel = (hasResponse: boolean): Status => (hasResponse ? "done" : "idle");

export function needsAttention({ result, checks }: AnalyzeResponse): boolean {
  return checks.summary.critical > 0 || result.image_quality === "poor" || !!result.confidence_note;
}
```

- [ ] **Step 4: Modify `useAnalysis.ts`**
  1. Replace `export type Status = …` with `import { DEFAULT_LANGUAGE, PROFILE, statusAfterCancel, type Status } from "./screen";` and `export type { Status } from "./screen";`.
  2. `useState("English")` → `useState(DEFAULT_LANGUAGE)`. Delete `profileId` state; `const activeProfile = PROFILE;` (internal only).
  3. Add `const responseRef = useRef<AnalyzeResponse | null>(null); responseRef.current = response;`.
  4. Turn the body of `analyze` into `const run = useCallback(async (language: string) => { … }, [deps])` using `language` instead of `targetLanguage` in `analyzeDocument(...)`; remove `targetLanguage` from its deps. Then:

```ts
const analyze = useCallback(() => run(targetLanguage), [run, targetLanguage]);
const reanalyze = useCallback(
  (language: string) => {
    setTargetLanguage(language);
    return run(language);
  },
  [run],
);
const cancel = useCallback(() => {
  abortRef.current?.abort();
  setStatus(statusAfterCancel(responseRef.current !== null));
}, []);
const backToStart = useCallback(() => {
  setResponse(null);
  setVerifications(null);
  setCoverage(null);
  setError(null);
  setStatus("idle");
}, []);
```
  5. Delete `switchProfile`; remove `activeProfile`/`switchProfile` from the returned object; add `reanalyze, cancel, backToStart`.
  6. After the hook: `export type Analysis = ReturnType<typeof useAnalysis>;`
  7. `App.tsx`: delete the `{a.meta.profiles.length > 1 && (…)}` document-type `<label>` block and change `onAnalyze={a.analyze}` to `onAnalyze={() => void a.analyze()}`.

- [ ] **Step 5: Run** — `npm test && npm run build` → PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat(frontend): screen state, cancel and re-analysis in useAnalysis"`

---

### Task 6: Start, processing and read-error screens; App screen switch

**Files:**
- Create: `frontend/src/components/StaffTopBar.tsx`, `frontend/src/features/start/StartScreen.tsx`, `frontend/src/features/start/DropZone.tsx`, `frontend/src/features/start/start.css`, `frontend/src/features/processing/ProcessingScreen.tsx`, `frontend/src/features/processing/ReadErrorScreen.tsx`, `frontend/src/features/processing/processing.css`
- Modify: `frontend/src/App.tsx`
- Test: none new (rendering); verify with `npm run build` and the manual check in Step 6.

**Interfaces:**
- Consumes: `Analysis` (Task 5), `screenFor` (Task 5), `Banner`, `SectionHead`, `StatusTag`, CSS classes (Task 1), `PreparedPage` (`features/upload/preparePages`).
- Produces:
  - `StaffTopBar({ onNewLetter }: { onNewLetter?: () => void })` — logo (`/favicon.svg`), "BefundVerstehen", right: ghost "Neuer Brief" when `onNewLetter` is given.
  - `StartScreen({ a }: { a: Analysis })`, `ProcessingScreen({ onCancel, sampleName }: { onCancel: () => void; sampleName?: string })`, `ReadErrorScreen({ onRetry, onUseSample }: { onRetry: () => void; onUseSample: () => void })`.
  - `App.tsx` switches on `screenFor(a.status, a.response)`; in this task the `"workspace"` branch keeps the existing results JSX (toolbar + `DocumentViewer` + `InsightsPanel`) unchanged — Task 9 replaces it.

- [ ] **Step 1: `DropZone.tsx`** — move the dropzone and page-thumbnail markup and logic from `features/upload/UploadPanel.tsx` (lines 44–125: `fileInput`/`cameraInput` refs, `dragging` state, `take`, the drag handlers, the hidden inputs and the `<ol className="thumbs">` list) into:

```tsx
interface Props {
  pages: PreparedPage[];
  maxPages: number;
  busy: boolean;
  onAddFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, delta: -1 | 1) => void;
}
export function DropZone(props: Props) { /* … */ }
```
German text: title "Brief hier ablegen", sub "Foto (JPG, PNG) oder PDF · bis zu {maxPages} Seiten · Seite flach und gut beleuchtet", buttons (both `btn btn-outline`, lucide `Upload` / `Camera` icons) "Datei auswählen", "Foto aufnehmen"; thumbnails `aria-label="Seiten in Reihenfolge"`, button labels "Nach vorne", "Seite entfernen", "Nach hinten", image alt `Seite {n}`. Dropzone styling in `start.css`: 1px dashed `var(--input)` border, `var(--radius-lg)`, 32px padding, `.is-dragging` → `background: var(--accent); border-color: var(--primary)`.

- [ ] **Step 2: `StartScreen.tsx`** (layout: `.container`, single column max 760px, cols 1–8 on desktop)

```tsx
const SAMPLE_LABEL: Record<string, string> = {
  entlassbrief: "Entlassbrief (Beispiel)",
  medikationsplan: "Medikationsplan (Beispiel)",
};
```
Order:
1. `<h1>` "Entlassbrief verständlich machen" (30/600, `letter-spacing:-0.02em`), lead `.muted` 18px: "Laden Sie einen Entlassbrief oder Medikationsplan hoch. Sie erhalten ein Patientenblatt in einfacher Sprache zum Ausdrucken."
2. `SectionHead marker="01"` "Sprache des Patientenblatts": `.field` with `<label class="label" for="lang">Sprache</label>` + `<select id="lang" class="select">` over `a.languages` (value `a.targetLanguage`, `onChange` → `a.setTargetLanguage`), hint "Die Sprache wird vor der Analyse gewählt. Ein Wechsel später startet eine neue Analyse."
3. `SectionHead marker="02"` "Brief hochladen": `<DropZone …/>`; below it, if `a.error`: `<Banner tone="danger" role="alert" title="Das hat nicht geklappt">{a.error}</Banner>`. Then "Oder ein Beispiel verwenden" (`.label`) and `<ul class="rows" role="radiogroup" aria-label="Beispiele">` with one `<li role="radio" aria-checked={…} tabIndex={0} class="row">` per `a.samples` item (`SAMPLE_LABEL[s.id] ?? s.label`); click / Enter / Space → `a.trySample(s.id)`; checked = the last chosen sample id (local state).
4. If `a.needsConsent`: `SectionHead marker="03"` "Einwilligung": `.checkbox` with the backend consent text (`a.domain?.privacy.consent_text` with `{provider}`/`{region}` replaced from `a.meta.processing`); if `a.domain?.privacy.recommend_eu_processing && !a.meta.processing.eu`: `<Banner tone="warning">Der KI-Dienst verarbeitet Daten außerhalb der EU ({region}). Für Gesundheitsdaten wird ein EU-Anbieter empfohlen.</Banner>`.
5. The one primary: `<button class="btn btn-primary" disabled={!a.pages.length || a.status !== "idle" || (a.needsConsent && !a.consent)} onClick={() => void a.analyze()}>Brief analysieren</button>`; under it `.hint`: `Verarbeitung: {provider} · {region}. Diese App speichert nichts.`

- [ ] **Step 3: `ProcessingScreen.tsx`**

```tsx
const STEPS = ["Brief wird gelesen", "Wichtige Angaben werden gesucht", "Text in einfacher Sprache wird geschrieben"];
```
State `done` (number of finished steps) advanced by `setTimeout` to 1 after 1500 ms and 2 after 4000 ms (clear on unmount). Render `<h1>` "Brief wird analysiert" (focus on mount via ref), optional `.hint` with `sampleName`, then `<ol class="rows" aria-live="polite">` — each row: lucide `CheckCircle2` (finished, `color: var(--success)`) or `Circle` (pending), the step text, and for finished steps the visible word "Fertig" in a `StatusTag tone="success"`. The current step shows `StatusTag` "Läuft". No spinner, no animation. Button `btn btn-outline` "Abbrechen" → `onCancel`.

- [ ] **Step 4: `ReadErrorScreen.tsx`** — `<h1 tabIndex={-1}>` (focused on mount) "Wir konnten den Brief nicht gut lesen"; `<Banner tone="warning">` "Das Foto ist zu unscharf, zu dunkel oder abgeschnitten."; tips list (`.rows`): "Legen Sie die Seite flach auf einen Tisch.", "Sorgen Sie für gutes Licht ohne Schatten.", "Fotografieren Sie die ganze Seite von oben.", "Halten Sie das Telefon still, bis das Bild scharf ist."; buttons: primary "Erneut versuchen" → `onRetry`, outline "Beispiel verwenden" → `onUseSample`.

- [ ] **Step 5: `StaffTopBar.tsx` and `App.tsx`**

```tsx
// App.tsx (shape)
const a = useAnalysis();
const screen = screenFor(a.status, a.response);
return (
  <div className="app">
    <StaffTopBar onNewLetter={screen === "start" ? undefined : a.reset} />
    {a.meta.analyzer === "mock" && (
      <div className="container"><Banner tone="info" title="Demo-Modus">Der Server hat keinen KI-Schlüssel. Es werden vorbereitete Beispielantworten angezeigt; Ihre Datei wird nicht gelesen.</Banner></div>
    )}
    {screen === "start" && <StartScreen a={a} />}
    {screen === "processing" && <ProcessingScreen onCancel={a.cancel} />}
    {screen === "read-error" && (
      <ReadErrorScreen
        onRetry={a.backToStart}
        onUseSample={() => { a.backToStart(); void a.trySample(a.samples[0].id); }}
      />
    )}
    {screen === "workspace" && /* existing results <main> JSX from the old App, unchanged */}
  </div>
);
```
Top bar: 56px, 1px bottom `var(--border)`, `.container` row with brand left. Remove the old `<header className="topbar">` (language select and `DisplaySettings` go away; the language now lives on the start screen). Remove imports that become unused (`Progress`, `UploadPanel`, `DisplaySettings`).

- [ ] **Step 6: Verify** — `npm test && npm run build` pass. Manual (backend running with `ANALYZER=mock`, `npm run dev`): pick "Entlassbrief (Beispiel)", tick consent, "Brief analysieren" → processing steps tick → old results view appears. "Abbrechen" during processing returns to the start screen with the page still listed. Keyboard: Tab reaches every control with a visible ring; Space selects a sample row.
- [ ] **Step 7: Commit** — `git commit -m "feat(frontend): staff start, processing and read-error screens"`

---

### Task 7: The printable handout

**Files:**
- Create: `frontend/src/features/handout/blocks.tsx`, `frontend/src/features/handout/Handout.tsx`, `frontend/src/features/handout/handout.css`
- Test: `frontend/src/features/handout/blocks.test.ts`

**Interfaces:**
- Consumes: `HandoutModel`, `Slot`, `HandoutItem`, `HandoutMedicine` (Task 3); `paginate`, `FlowBlock`, `Pagination`, `SHEET_CONTENT_HEIGHT_PX`, `SHEET_MM` (Task 4); `StatusTag` (Task 1); lucide `Siren`.
- Produces (used by Task 9):

```ts
// blocks.tsx
export interface HandoutBlock extends Omit<FlowBlock, "height" | "continuationHeight"> {
  key: string;      // "header" | "title1" | "why" | "actions" | "meds-head" | `med-${id}` | "stopped" | "help" | "checkup" | "instructions" | "contacts" | "footer"
  node: ReactNode;
}
export function buildBlocks(model: HandoutModel, onSelectItem?: (id: string) => void): HandoutBlock[];
export function continuationHeader(model: HandoutModel, group: string): ReactNode; // group "meds" → "Your medicines (continued)" + column header row

// Handout.tsx
export interface HandoutLayout { pages: number; overflowing: number[] }
export function Handout(props: { model: HandoutModel; onSelectItem?: (id: string) => void; onLayout?: (l: HandoutLayout) => void }): JSX.Element;
```

Block rules (in order; omit a block whose content is empty — Review Focus 3):
- `header`: hospital (`model.hospital`, 600) if present, `t.madeWith` small muted; write-in lines `t.name ________`, `t.admitted ________  t.discharged ________`.
- `title1`: `<h1>` `t.title1`.
- `why` (marker): `t.why` heading, `summary`, then diagnoses as rows (title 600 + text).
- `actions` (marker, only if `actions.length`): numbered `<ol>`.
- `meds-head` (marker, `keepWithNext`, `group: "meds"`, only if `medicines.length`): `t.medicines` heading + column header row (`t.medicine`, `t.purpose`, then `t[slot]` for each of `model.slots`).
- `med-${id}` (`group: "meds"`) per medicine: grid row — title (600) + `StatusTag` (`t.tagNew` / `t.tagChanged`) + small `t.boxName: {boxName}`; `purpose`; one cell per slot with the dose in `.mono` and an empty tick box (`<span class="tick" aria-hidden>`), empty cell when the dose is null; notes line spanning all columns. Low confidence → class `is-unsure` + `<button class="preview-only">` wrapping a `StatusTag tone="warning"` "Bitte prüfen" that calls `onSelectItem(id)`.
- `stopped` (marker, only if `stopped.length`): `t.stopTaking` + rows (title, boxName, notes).
- `help` (`breakBefore`, marker): `<h1>` `t.title2`, `t.help` heading, emergency box (lucide `Siren`, `t.emergencyTitle`, `t.emergencyText`, label `t.generalAdvice`), then warning-sign rows, or `t.noWarningSigns` when there are none.
- `checkup`, `instructions`, `contacts` (marker each, only if non-empty): rows with title (600), value (`.mono`, plain text — never a link), text.
- `footer`: `t.discussedWith ________  t.date ______` and `t.disclaimer`.
Markers are "01", "02", … counted over rendered marker blocks. Low-confidence key items get the same `is-unsure` treatment.

- [ ] **Step 1: Write the failing test** — `blocks.test.ts` (node environment; only block metadata is asserted)

```ts
import { describe, expect, it } from "vitest";
import { loadSample } from "../../test/samples";
import { DEFAULT_SETTINGS, buildHandout } from "./model";
import { buildBlocks } from "./blocks";

const keys = (m: ReturnType<typeof buildHandout>) => buildBlocks(m).map((b) => b.key);

describe("buildBlocks", () => {
  it("orders the discharge letter into two pages", () => {
    const m = buildHandout(loadSample("entlassbrief"));
    expect(keys(m)).toEqual([
      "header", "title1", "why", "actions", "meds-head",
      ...m.medicines.map((x) => `med-${x.id}`),
      "stopped", "help", "checkup", "instructions", "contacts", "footer",
    ]);
    const blocks = buildBlocks(m);
    expect(blocks.find((b) => b.key === "help")!.breakBefore).toBe(true);
    expect(blocks.find((b) => b.key === "meds-head")!.keepWithNext).toBe(true);
    expect(blocks.filter((b) => b.group === "meds")).toHaveLength(m.medicines.length + 1);
  });
  it("omits empty and switched-off sections but always keeps help (Review Focus 3)", () => {
    const m = buildHandout(loadSample("medikationsplan"), { ...DEFAULT_SETTINGS, showActions: false, showCheckup: false });
    const k = keys(m);
    expect(k).not.toContain("actions");
    expect(k).not.toContain("checkup");
    expect(k).not.toContain("stopped");
    expect(k).toContain("help");
  });
});
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement `blocks.tsx`** per the rules.
- [ ] **Step 4: Implement `Handout.tsx`**
  - `const blocks = useMemo(() => buildBlocks(model, onSelectItem), [model, onSelectItem])`.
  - Measuring layer: `<div className="handout handout-measure" data-size={model.settings.size} dir={model.dir} lang={model.htmlLang} aria-hidden ref={measureRef}>` containing every `block.node` in `<div data-block>` and `continuationHeader(model, "meds")` in `<div data-continuation="meds">`. CSS: `position:absolute; left:-10000px; top:0; visibility:hidden; width: calc(210mm - 32mm)`.
  - `useLayoutEffect` on `[blocks]`: measure each `[data-block]` with `getBoundingClientRect().height`, build `FlowBlock[]` (copy `breakBefore`, `keepWithNext`, `group`; `continuationHeight` from `[data-continuation]` for grouped blocks), `setPagination(paginate(flow, SHEET_CONTENT_HEIGHT_PX))`; run again after `document.fonts.ready`. Call `onLayout({ pages: p.sheets.length, overflowing: p.overflowing })` when it changes.
  - `Sheets` (inner component): for each sheet `<article className="sheet" data-overflow={overflowing.includes(i) || undefined} aria-label={`Seite ${i + 1}`}>` with `.sheet-inner` holding (if `continued[i]`) the continuation header and the sheet's block nodes; `.sheet-number` "i + 1 / n" bottom right.
  - Render `Sheets` twice: once in `<div className="handout-preview">` and once through `createPortal(<div className="print-root">…</div>, document.body)`. Both use `data-size`, `dir`, `lang`.
- [ ] **Step 5: `handout.css`** (import it from `Handout.tsx`)

```css
.handout { font-family: var(--font-sans); color: #000; line-height: 1.45; }
.handout[data-size="normal"] { font-size: 12pt; }
.handout[data-size="large"] { font-size: 14pt; }
.handout h1 { font-size: 1.5em; line-height: 1.2; margin: 0 0 0.6em; }
.handout h2 { font-size: 1.15em; margin: 0; }
.handout .h-block { padding-top: 0.9em; }               /* spacing lives inside blocks so heights add up */
.handout .h-section { display: grid; grid-template-columns: 2.2em 1fr; gap: 0 0.5em; border-top: 1px solid #000; padding-top: 0.5em; margin-bottom: 0.4em; }
.handout .h-marker { font: 400 0.8em/1.6 var(--font-mono); }
.handout .mono { font-family: var(--font-mono); }
.handout .med-row { display: grid; grid-template-columns: 2fr 2fr repeat(var(--slots), 0.8fr); gap: 0.4em; border-top: 1px solid #999; padding: 0.35em 0; }
.handout .med-notes { grid-column: 1 / -1; font-size: 0.85em; }
.handout .tick { display: inline-block; width: 0.9em; height: 0.9em; border: 1.5px solid #000; border-radius: 2px; vertical-align: -0.1em; margin-inline-start: 0.3em; }
.handout .emergency { border: 2px solid var(--destructive); background: var(--destructive-surface); border-radius: 6px; padding: 0.6em 0.8em; display: grid; grid-template-columns: auto 1fr; gap: 0.2em 0.6em; }
.handout .emergency .label { grid-column: 2; font-size: 0.8em; }
.handout .write-in { display: inline-block; min-width: 9em; border-bottom: 1px solid #000; }
.handout .is-unsure { outline: 1px dashed var(--warning); outline-offset: 2px; }
.handout-preview { display: grid; gap: 24px; justify-items: center; overflow-x: auto; padding: 24px 0; }
.sheet { width: 210mm; height: 297mm; background: #fff; border: 1px solid var(--border); box-shadow: var(--shadow-lg); position: relative; overflow: hidden; }
.sheet[data-overflow] { outline: 2px solid var(--destructive); }
.sheet-inner { padding: 14mm 16mm; }
.sheet-number { position: absolute; right: 16mm; bottom: 7mm; font: 400 9pt var(--font-mono); }
.print-root { display: none; }

@media print {
  @page { size: A4; margin: 0; }
  body > :not(.print-root) { display: none !important; }
  .print-root { display: block; }
  .print-root .sheet { border: 0; box-shadow: none; outline: 0; break-after: page; }
  .preview-only { display: none !important; }
  .handout .is-unsure { outline: 0; }
  .handout .emergency { background: none; border-color: #000; }
}
```
The literal `#000`/`#fff`/`#999` are print colours (black-and-white safety); Task 10's colour test allows them only in `handout.css`. Set `--slots` inline on each med row: `style={{ "--slots": model.slots.length } as CSSProperties}`.

- [ ] **Step 6: Verify** — `npm test && npm run build`. Manual: temporarily render `<Handout model={buildHandout(a.response.result)} />` in the workspace branch (do not commit this line); in Chrome, sample "Entlassbrief": 2 sheets; Print preview (Cmd+P) shows exactly the sheets, A4, no app chrome; switching `data-size` to normal keeps ≤ 2 pages. Remove the temporary line.
- [ ] **Step 7: Commit** — `git commit -m "feat(frontend): printable A4 handout with measured pagination"`

---

### Task 8: Patient guide (on screen)

**Files:**
- Create: `frontend/src/features/guide/myDay.ts`, `frontend/src/features/guide/prefs.ts`, `frontend/src/features/guide/PatientGuide.tsx`, `frontend/src/features/guide/Overview.tsx`, `frontend/src/features/guide/Details.tsx`, `frontend/src/features/guide/TextSizeControl.tsx`, `frontend/src/features/guide/guide.css`
- Modify: `frontend/src/features/accessibility/ReadAloudButton.tsx`
- Test: `frontend/src/features/guide/myDay.test.ts`, `frontend/src/features/guide/prefs.test.ts`

**Interfaces:**
- Consumes: `HandoutModel`, `HandoutMedicine`, `Slot`, `SLOTS` (Task 3); `SectionHead`, `StatusTag` (Task 1); `ReadAloudButton`.
- Produces (used by Task 9): `PatientGuide({ model }: { model: HandoutModel })` — `model` built with `showActions: true, showCheckup: true`.

```ts
// myDay.ts
export interface DayGroup { slot: Slot | "other"; items: { medicine: HandoutMedicine; dose: string | null }[] }
export function groupByTime(medicines: HandoutMedicine[]): DayGroup[]; // SLOTS order, empty groups omitted, "other" last = medicines with no daily dose
// prefs.ts
export type TextSize = "standard" | "large" | "xl";
export function readTextSize(storage?: Pick<Storage, "getItem">): TextSize;   // default "large"; invalid or throwing → "large"
export function writeTextSize(size: TextSize, storage?: Pick<Storage, "setItem">): void; // swallows errors
// ReadAloudButton gains: stopLabel?: string (default "Stop reading"); icons lucide Volume2 / Square instead of emoji.
```

- [ ] **Step 1: Write the failing tests**

`myDay.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { loadSample } from "../../test/samples";
import { buildHandout } from "../handout/model";
import { groupByTime } from "./myDay";

const names = (g: ReturnType<typeof groupByTime>[number]) => g.items.map((i) => i.medicine.boxName.split(" ")[0]);

describe("groupByTime", () => {
  it("groups the discharge letter by time of day", () => {
    const groups = groupByTime(buildHandout(loadSample("entlassbrief")).medicines);
    expect(groups.map((g) => g.slot)).toEqual(["morning", "evening"]);
    expect(names(groups[0])).toEqual(["Ramipril", "Amlodipin", "Cefuroxim"]);
  });
  it("puts weekly and as-needed medicines under 'other' (Review Focus 2)", () => {
    const groups = groupByTime(buildHandout(loadSample("medikationsplan")).medicines);
    expect(groups.map((g) => g.slot)).toEqual(["morning", "evening", "other"]);
    expect(names(groups[2])).toEqual(["Methotrexat", "Folsäure", "Paracetamol"]);
    expect(groups[0].items.find((i) => i.medicine.boxName.startsWith("Metformin"))!.dose).toBe("½");
  });
});
```

`prefs.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { readTextSize, writeTextSize } from "./prefs";

describe("text size preference", () => {
  it("defaults to large", () => expect(readTextSize({ getItem: () => null })).toBe("large"));
  it("ignores invalid values and broken storage", () => {
    expect(readTextSize({ getItem: () => "huge" })).toBe("large");
    expect(readTextSize({ getItem: () => { throw new Error("blocked"); } })).toBe("large");
    expect(() => writeTextSize("xl", { setItem: () => { throw new Error("blocked"); } })).not.toThrow();
  });
  it("round-trips a valid value", () => {
    const store = new Map<string, string>();
    writeTextSize("xl", { setItem: (k, v) => void store.set(k, v) });
    expect(readTextSize({ getItem: (k) => store.get(k) ?? null })).toBe("xl");
  });
});
```
Storage key: `"bv.guideTextSize"`. When `storage` is omitted, use `globalThis.localStorage` inside the try.

- [ ] **Step 2: Run** → FAIL. **Step 3:** implement `myDay.ts` and `prefs.ts`. **Step 4:** run → PASS.

- [ ] **Step 5: Components**
  - `PatientGuide`: root `<section className="guide" data-text-size={size} dir={model.dir} lang={model.htmlLang}>`. Top row: underline tabs (`role="tablist"`, two `role="tab"` buttons `t.overview` / `t.details`, arrow keys move between them) and `TextSizeControl` right. Tab panels `role="tabpanel"`. `onShowHelp` from Overview switches to Details and focuses `#guide-help` (`requestAnimationFrame(() => document.getElementById("guide-help")?.focus())`).
  - `TextSizeControl`: visible label `t.textSize`, three `btn btn-outline` buttons with `aria-pressed` (labels `A− {t.sizeStandard}`, `A {t.sizeLarge}`, `A+ {t.sizeXL}`); persists via `writeTextSize`.
  - `Overview`: `SectionHead marker="01"` `t.why` + summary paragraph; `"02"` `t.actions` + numbered list (if any); `"03"` `t.help` + emergency box + first two warning signs (or `t.noWarningSigns`) + `btn btn-link` `t.allWarningSigns` → `onShowHelp`. Each section's `aside` is a `ReadAloudButton` (`label={t.readAloud}`, `stopLabel={t.stopReading}`, `targetLanguage={model.language}`, text = heading + content joined with ". ").
  - `Details`: sections in this order (skip empty ones, numbered markers): `t.diagnoses` (rows); `t.myDay` (one `h3` per `groupByTime` group — `t[slot]` or `t.otherTimes` — listing title + dose `.mono` + notes); `t.medicines` (one row per medicine: title, `StatusTag` tag, purpose, `t.boxName`, notes) then `t.stopTaking` rows; `t.instructions`; `t.checkup`; `t.help` with `id="guide-help"` (emergency box + all warning signs or fallback); `t.contacts` (values `.mono`, plain text).
  - `guide.css`: `.guide { font-size: 1.25rem; }` `[data-text-size="standard"] { font-size: 1.125rem; }` `[data-text-size="xl"] { font-size: 1.5rem; }`; body line-height 1.6, measure `max-width: 65ch` for paragraphs; headings in `em` (h2 1.2em, h3 1.05em); all buttons inside `.guide` `min-height: 48px`; rows min 48px; emergency box as in the handout but with `var(--destructive-surface)` / `var(--destructive)` border and `var(--destructive-text)` title; one column; no horizontal scroll at 390px (`overflow-wrap: anywhere` on values).

- [ ] **Step 6: Verify** — `npm test && npm run build`. Manual: temporarily render `<PatientGuide model={buildHandout(a.response.result)} />` in the workspace branch (do not commit); check tabs by keyboard, text sizes persist after reload, "See all warning signs" lands on the help heading, read-aloud starts and stops; at 390px width with Extra large there is no horizontal scroll. Remove the temporary line.
- [ ] **Step 7: Commit** — `git commit -m "feat(frontend): on-screen patient guide with text size and read-aloud"`

---

### Task 9: Workspace, Check tab and final App wiring

**Files:**
- Create: `frontend/src/features/workspace/Workspace.tsx`, `frontend/src/features/workspace/HandoutSettings.tsx`, `frontend/src/features/workspace/CheckTab.tsx`, `frontend/src/features/workspace/workspace.css`
- Modify: `frontend/src/App.tsx`, `frontend/src/features/safety/ChecksPanel.tsx`
- Test: `frontend/src/features/workspace/pageStatus.test.ts` (+ `pageStatus.ts`)

**Interfaces:**
- Consumes: `Analysis` (Task 5), `needsAttention` (Task 5), `buildHandout`, `DEFAULT_SETTINGS`, `HandoutSettings` (Task 3), `Handout`, `HandoutLayout` (Task 7), `PatientGuide` (Task 8), `DocumentViewer`, `ChecksPanel`, `highlightItems`, `Banner`, `StatusTag`.
- Produces: `Workspace({ a }: { a: Analysis })`; `pageStatus(layout: HandoutLayout): { text: string; tone: "neutral" | "warning" | "danger" }`.

- [ ] **Step 1: Write the failing test** — `pageStatus.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { pageStatus } from "./pageStatus";

describe("pageStatus", () => {
  it("is neutral up to two pages", () => {
    expect(pageStatus({ pages: 1, overflowing: [] })).toEqual({ text: "1 Seite", tone: "neutral" });
    expect(pageStatus({ pages: 2, overflowing: [] })).toEqual({ text: "2 Seiten", tone: "neutral" });
  });
  it("warns above two pages", () => {
    expect(pageStatus({ pages: 3, overflowing: [] })).toEqual({
      text: "3 Seiten — wählen Sie 12 pt oder blenden Sie Abschnitte aus", tone: "warning",
    });
  });
  it("flags overflowing sheets", () => {
    expect(pageStatus({ pages: 2, overflowing: [1] })).toEqual({ text: "Seite 2 ist zu voll", tone: "danger" });
  });
});
```
- [ ] **Step 2: Run** → FAIL. **Step 3:** implement `pageStatus.ts` (overflow first, then >2, else neutral; "1 Seite" / "n Seiten"). **Step 4:** run → PASS.

- [ ] **Step 5: `HandoutSettings.tsx`** — props `{ settings, onChange, language, languages, onChangeLanguage }`. Fieldsets (`.panel`): "Schriftgröße" — two `btn btn-outline` with `aria-pressed`: "Normal (12 pt)", "Groß (14 pt)"; "Abschnitte" — checkboxes "Was jetzt zu tun ist", "Kontrolltermin", plus `.hint` "Medikamente und Warnzeichen werden immer gedruckt."; "Sprache" — current language + `btn btn-link` "Ändern" revealing a `.select` of `languages` and an outline "Neu analysieren" button; on click `window.confirm("Dies startet eine neue Analyse (ca. 30 Sekunden). Fortfahren?")` → `onChangeLanguage(lang)`.

- [ ] **Step 6: `CheckTab.tsx`** — props `{ a, activeItemId, onSelectItem }`. Two-column grid (viewer cols 1–7, checks cols 8–12; stacked under 1024px). Mode toggle `btn btn-outline` pair with `aria-pressed`: "Markierungen" (`"highlights"`) / "Original" (`"original"`). `DocumentViewer` with `pages=a.pages`, `result`, `items=highlightItems(result)`, `verifications`, `mode`, `activeItemId`, `onSelectItem`, `activeBlockId={null}`, `onSelectBlock={() => {}}`. `ChecksPanel` with `checks`, `coverage`, `ocrState`, `onSelectItem`.

- [ ] **Step 7: `ChecksPanel.tsx` German + restyle** — translate all literals: severity labels "Vor dem Drucken prüfen" / "Bitte prüfen" / "Hinweis"; categories: grounding "Nicht im Brief gefunden", completeness "Möglicherweise fehlend", legal "Rechtliche Regel", scam "Betrugsverdacht", injection "Manipulation", quality "Lesequalität", escalation "Hilfe holen", advice "Nicht im Dokument", readability "Schwer lesbar", safety "Sicherheitshinweis"; heading "Sicherheitsprüfung"; stats "Angaben im Brief belegt", "des Textes auf dem Foto erfasst", "Punkte zu prüfen" (1: "Punkt zu prüfen"), "Lesbarkeit: {level}" (keep the score); "Dokumenttyp"; coverage text "Ein Teil des Textes auf dem Foto wurde vielleicht nicht gelesen, z. B. …. Vergleichen Sie das Patientenblatt mit dem Brief."; "{n} Hinweis(e)"; all-clear "Keine Probleme gefunden. Jede Angabe wurde im Dokument wiedergefunden."; "Im Dokument zeigen"; escalation heading "Hilfe holen"; scam alarm "Dieser Brief könnte gefälscht oder manipuliert sein. Prüfen Sie ihn, bevor Sie ihn weitergeben." Replace emoji icons with lucide `OctagonAlert` / `AlertTriangle` / `Info` and use `StatusTag` (danger / warning / neutral) next to each finding's category word. Finding messages from the backend stay as they are.

- [ ] **Step 8: `Workspace.tsx`**

```tsx
type Tab = "handout" | "check" | "guide";
export function Workspace({ a }: { a: Analysis }) {
  const res = a.response!;
  const [tab, setTab] = useState<Tab>("handout");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [layout, setLayout] = useState<HandoutLayout | null>(null);
  const model = useMemo(() => buildHandout(res.result, settings), [res, settings]);
  const guideModel = useMemo(() => buildHandout(res.result, DEFAULT_SETTINGS), [res]);
  const openInCheck = useCallback((id: string) => { setActiveItemId(id); setTab("check"); }, []);
  // …
}
```
Layout (`.container`): page header row — `<h1>` "Patientenblatt" (30/600) + `.muted` meta `{document_type} · {result.target_language}`; right: page `StatusTag` from `pageStatus(layout)` and, on the Handout tab only, the one primary `btn btn-primary` with lucide `Printer` "Drucken / Als PDF speichern" → `window.print()`. If `needsAttention(res)`: `<Banner tone="warning" title="Bitte vor dem Drucken prüfen" action={<button className="btn btn-outline" onClick={() => setTab("check")}>Zur Prüfung</button>}>` with `result.confidence_note` or "Die Sicherheitsprüfung hat wichtige Hinweise gefunden." If `a.error`: `<Banner tone="danger" role="alert">`. Underline tabs: "Patientenblatt", "Prüfen", "Patientenansicht" (`role="tablist"`, arrow keys). Panels: Handout tab = grid `HandoutSettings` (cols 1–3) + `<Handout model={model} onSelectItem={openInCheck} onLayout={setLayout} />` (cols 4–12; stacked under 1024px); Check tab = `CheckTab`; Guide tab = `<PatientGuide model={guideModel} />`. `onChangeLanguage={(l) => void a.reanalyze(l)}`.
  Keep `Handout` mounted while other tabs are shown (hide with the `hidden` attribute) so printing always has sheets.

- [ ] **Step 9: `App.tsx`** — workspace branch becomes `<Workspace a={a} />`; remove the old results JSX and its now-unused imports and state (`mode`, `activeItemId`, `activeBlockId`, `items`, `InsightsPanel`, `DocumentViewer`, `highlightItems`). `ProcessingScreen` gets `sampleName` when a sample is loaded (`a.pages[0]?.sourceName`).

- [ ] **Step 10: Verify** — `npm test && npm run build`. Manual (mock backend): sample → Handout tab with 2 sheets and "2 Seiten"; 12 pt / 14 pt and section switches update the preview; "Drucken" opens the print dialog showing only the sheets; a low-confidence item (edit a sample in DevTools is not needed — check the class exists in the code path) opens the Check tab; Check tab shows highlights and findings in German; Patientenansicht works; language "Ändern" → confirm → processing → workspace; "Abbrechen" during that returns to the workspace with the old result.
- [ ] **Step 11: Commit** — `git commit -m "feat(frontend): staff workspace with handout, check and guide tabs"`

---

### Task 10: Cleanup, colour discipline, docs and final verification

**Files:**
- Delete: `frontend/src/features/insights/`, `frontend/src/features/medication/`, `frontend/src/features/calendar/`, `frontend/src/features/upload/UploadPanel.tsx`, `frontend/src/features/accessibility/DisplaySettings.tsx`, `frontend/src/components/Progress.tsx`
- Modify: `frontend/src/styles.css`, `HOW_IT_WORKS.md` (frontend file map and the "Add a UI feature" rows), `CLAUDE.md` (add `npm test` under frontend commands)
- Test: `frontend/src/test/colors.test.ts`

- [ ] **Step 1: Write the failing test** — `colors.test.ts`

```ts
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("../", import.meta.url);
const cssFiles = (readdirSync(root, { recursive: true }) as string[]).filter((f) => f.endsWith(".css"));
const COLOR = /#[0-9a-fA-F]{3,8}\b|rgba?\(/g;

describe("colour discipline", () => {
  it("uses literal colours only in theme.css, the kind palette and print colours", () => {
    for (const f of cssFiles) {
      if (f.endsWith("theme.css")) continue;
      let css = readFileSync(new URL(f, root), "utf8");
      css = css.replace(/\/\* kind palette:start[\s\S]*?kind palette:end \*\//, "");
      if (f.endsWith("handout.css")) css = css.replace(/#(000|fff|999)\b/g, "");
      expect(css.match(COLOR) ?? [], f).toEqual([]);
    }
  });
});
```
- [ ] **Step 2: Run** → FAIL (old rules in `styles.css` still use literals).
- [ ] **Step 3: Delete the files listed above**; `npm run build` must still pass (fix any leftover import).
- [ ] **Step 4: Remove dead CSS** — list class selectors that no longer appear in any `.tsx`:

```bash
cd frontend/src
for c in $(grep -oE '\.[a-zA-Z][a-zA-Z0-9_-]+' styles.css | sort -u | sed 's/^\.//'); do
  grep -rqE "[\"' ]$c[\"' ]|\"$c\"|$c[\` ]|-$c" --include='*.tsx' . || echo "$c"
done
```
Delete the rules for every listed class (check each by eye: dynamic classes such as `tone-${tone}`, `sev-${…}`, `mode-${…}`, `is-${…}` are used through template strings and must stay). Replace remaining literal colours outside the kind palette with tokens (`rgba(…)` backgrounds → the matching `--*-surface`), and remove the alias block entries that are no longer referenced.
- [ ] **Step 5: Run** — `npm test && npm run build` → PASS.
- [ ] **Step 6: Docs** — `HOW_IT_WORKS.md`: replace mentions of `UploadPanel`, `InsightsPanel`, calendar reminders and the document-type switcher with the new flow (start → processing → workspace with Patientenblatt / Prüfen / Patientenansicht) and the new folders (`features/start`, `processing`, `handout`, `guide`, `workspace`, `i18n/handout.ts`). `CLAUDE.md`: add `npm test                                              # vitest: handout model, pagination, strings` under `# frontend/`.
- [ ] **Step 7: Backend untouched check** — `git diff develop --stat -- backend` prints nothing; `cd backend && .venv/bin/python -m pytest -q` → 51 passed; `.venv/bin/python -m evaluation.benchmark | grep Detected` → 154 of 154, 0 false alarms.
- [ ] **Step 8: Manual verification (mock backend)** — for both samples: Chrome print preview at 12 pt and 14 pt → ≤ 2 pages, A4, only sheets printed, black-and-white readable; re-analyse in Arabic (mock still answers English → handout stays LTR English, by design) and confirm `dir="rtl"` by temporarily editing `target_language` in DevTools React state is NOT required — the unit test covers it; widths 390 px and 1280 px have no horizontal page scroll (the A4 preview scrolls inside its own pane); keyboard-only pass through start → workspace → print; `prefers-reduced-motion` on → no transitions.
- [ ] **Step 9: Commit** — `git commit -m "chore(frontend): remove the old results UI, enforce token colours, update docs"`
