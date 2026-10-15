// Test helper: the medical domain's bundled sample answers (backend/app/domains/medical_document/samples/).
import { readFileSync } from "node:fs";
import type { AnalysisResult } from "../api/types";

const DIR = new URL("../../../backend/app/domains/medical_document/samples/", import.meta.url);

export type SampleId = "entlassbrief" | "medikationsplan";

export function loadSample(id: SampleId): AnalysisResult {
  return JSON.parse(readFileSync(new URL(`${id}.json`, DIR), "utf8")) as AnalysisResult;
}
