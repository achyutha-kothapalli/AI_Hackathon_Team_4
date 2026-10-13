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
}

export interface AnalysisResult {
  document_type: string;
  sender: string | null;
  source_language: string;
  target_language: string;
  summary: string;
  action_steps: string[];
  key_items: KeyItem[];
  blocks: TextBlock[];
  confidence_note: string | null;
}

export interface AnalyzeResponse {
  result: AnalysisResult;
  analyzer: string;
  profile: string;
  page_count: number;
}

export interface ProfileInfo {
  id: string;
  name: string;
  description: string;
  source_language: string;
}

export interface Meta {
  analyzer: string;
  default_profile: string;
  profiles: ProfileInfo[];
  languages: string[];
  max_pages: number;
  max_total_upload_bytes: number;
}
