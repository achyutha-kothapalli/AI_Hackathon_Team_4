import { describe, expect, it } from "vitest";
import { loadSample } from "../../test/samples";
import { DEFAULT_SETTINGS, buildHandout } from "./model";
import { buildBlocks } from "./blocks";

const keys = (m: ReturnType<typeof buildHandout>) => buildBlocks(m).map((b) => b.key);

describe("buildBlocks", () => {
  it("orders the discharge letter into two pages", () => {
    const m = buildHandout(loadSample("entlassbrief"));
    expect(keys(m)).toEqual([
      "header", "glance", "why", "actions", "my-day", "meds-head",
      ...m.medicines.map((x) => `med-${x.id}`),
      "stopped", "help", "visits", "instructions", "footer",
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
    expect(k).toContain("visits"); // contacts remain without the check-up
    expect(k).not.toContain("stopped");
    expect(k).toContain("help");
  });
});
