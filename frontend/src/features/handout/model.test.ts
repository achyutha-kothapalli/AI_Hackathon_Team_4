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
  it("falls back to English strings for a result language without handout strings", () => {
    const r = { ...loadSample("entlassbrief"), target_language: "Turkish" };
    const m = buildHandout(r);
    expect(m.language).toBe("Turkish");
    expect(m.t).toBe(stringsFor("English"));
    expect(m.dir).toBe("ltr");
    expect(m.htmlLang).toBe("en");
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
