// Used only until GET /api/meta answers (or if the backend is unreachable).
// The real values come from the backend's domain pack (backend/app/domains/).

import type { DomainUI, Meta, SampleInfo } from "../api/types";

export const FALLBACK_UI: DomainUI = {
  headline: "Understand official letters in your language",
  intro:
    "Take a photo of a German letter. You get a translation, the deadlines and amounts that matter, and exactly where each one is written on the page.",
  upload_title: "Photograph or upload your letter",
  upload_hint: "Photos (JPEG, PNG) or a PDF · up to {max_pages} pages · lay the page flat in good light",
  disclaimer:
    "AI translations can contain mistakes. For legal decisions, check with the sender or an advice centre (e.g. Verbraucherzentrale, Migrationsberatung).",
  progress: [
    "Reading your document…",
    "Translating every paragraph…",
    "Looking for deadlines and amounts…",
    "Writing a plain-language summary…",
  ],
};

export const FALLBACK_SAMPLES: SampleInfo[] = [
  { id: "bussgeldbescheid", label: "Genuine fine notice", image: "/sample/bussgeldbescheid.png" },
  { id: "scam_inkasso", label: "Fake debt collection (scam)", image: "/sample/scam_inkasso.png" },
  { id: "injection_hundesteuer", label: "Letter with hidden AI instructions", image: "/sample/injection_hundesteuer.png" },
];

export const FALLBACK_META: Meta = {
  version: "unknown",
  analyzer: "unknown",
  default_profile: "german_letter",
  profiles: [],
  languages: ["English"],
  max_pages: 6,
  max_total_upload_bytes: 4_400_000,
};
