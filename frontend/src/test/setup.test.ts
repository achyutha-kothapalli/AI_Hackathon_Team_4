import { describe, expect, it } from "vitest";
import { loadSample } from "./samples";

describe("test setup", () => {
  it("loads both bundled medical samples", () => {
    expect(loadSample("entlassbrief").medications.length).toBe(4);
    expect(loadSample("medikationsplan").medications.length).toBe(7);
  });
});
