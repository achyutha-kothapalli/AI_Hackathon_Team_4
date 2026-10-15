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
