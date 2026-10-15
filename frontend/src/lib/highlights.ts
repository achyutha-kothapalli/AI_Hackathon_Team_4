import type { AnalysisResult, BBox, KeyItemKind } from "../api/types";

/** Anything drawn as a numbered highlight on the page: key facts and medicines. */
export interface Highlightable {
  id: string;
  kind: KeyItemKind;
  label: string;
  value: string;
  page: number;
  bbox: BBox;
  source_quote: string;
}

export function highlightItems(result: AnalysisResult): Highlightable[] {
  return [
    ...result.key_items,
    ...result.medications.map((m) => ({
      id: m.id,
      kind: "medication" as const,
      label: m.name,
      value: [m.strength, m.schedule_text].filter(Boolean).join(" · "),
      page: m.page,
      bbox: m.bbox,
      source_quote: m.source_quote,
    })),
  ];
}
