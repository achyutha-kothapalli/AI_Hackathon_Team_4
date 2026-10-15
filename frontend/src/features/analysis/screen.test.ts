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
