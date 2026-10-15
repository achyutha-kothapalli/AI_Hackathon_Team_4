// Mirrors backend/app/schemas/analysis.py — change both together.

/** Region in 1/1000 units of page width/height, origin top-left. */
export interface BBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface TextBlock {
  id: string;
  page: number;
  bbox: BBox;
  original: string;
  translation: string;
}

export type KeyItemKind =
  | "deadline"
  | "payment"
  | "appointment"
  | "reference"
  | "contact"
  | "consequence"
  | "document_required"
  | "other";

export type Importance = "high" | "medium" | "low";
export type Confidence = "high" | "medium" | "low";
export type ImageQuality = "good" | "poor" | "unreadable";

export interface KeyItem {
  id: string;
  kind: KeyItemKind;
  importance: Importance;
  label: string;
  value: string;
  explanation: string;
  date: string | null;
  amount: number | null;
  currency: string | null;
  page: number;
  bbox: BBox;
  source_quote: string;
  confidence: Confidence;
}

export interface AnalysisResult {
  document_type: string;
  document_class: string;
  image_quality: ImageQuality;
  sender: string | null;
  source_language: string;
  target_language: string;
  summary: string;
  action_steps: string[];
  key_items: KeyItem[];
  blocks: TextBlock[];
  confidence_note: string | null;
  suspicious_instructions: string | null;
}

// ---- Accuracy & safety harness (backend/app/schemas/harness.py) ----

export type Severity = "info" | "warning" | "critical";
export type FindingCategory =
  | "grounding"
  | "completeness"
  | "legal"
  | "scam"
  | "injection"
  | "quality"
  | "escalation";

export interface Finding {
  rule_id: string;
  category: FindingCategory;
  severity: Severity;
  message: string;
  item_ids: string[];
  evidence: string | null;
  legal_basis: string | null;
}

export interface ItemCheck {
  item_id: string;
  grounded: boolean;
  issues: string[];
}

export interface HelpResource {
  id: string;
  label: string;
  url: string | null;
  description: string;
}

export interface HarnessReport {
  document_class: { id: string; label: string; lineage: string[]; source: string };
  findings: Finding[];
  item_checks: Record<string, ItemCheck>;
  escalation: { reason: string; resources: HelpResource[] } | null;
  scam_suspected: boolean;
  summary: { total_items: number; grounded_items: number; critical: number; warnings: number; infos: number };
}

export interface AnalyzeResponse {
  result: AnalysisResult;
  checks: HarnessReport;
  analyzer: string;
  profile: string;
  page_count: number;
}

export interface SampleInfo {
  id: string;
  label: string;
  image: string;
}

/** Wording for one use case, from the backend's domain pack. */
export interface DomainUI {
  headline: string;
  intro: string;
  upload_title: string;
  upload_hint: string; // "{max_pages}" is replaced by the page limit
  disclaimer: string;
  progress: string[];
}

/** A domain pack (backend/app/domains/<id>/), called "profile" in the API. */
export interface ProfileInfo {
  id: string;
  name: string;
  description: string;
  source_language: string;
  ocr_language: string;
  ui: DomainUI;
  samples: SampleInfo[];
}

export interface Meta {
  version: string;
  analyzer: string;
  default_profile: string;
  profiles: ProfileInfo[];
  languages: string[];
  max_pages: number;
  max_total_upload_bytes: number;
}
