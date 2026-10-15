import { describe, expect, it } from "vitest";
import { pageStatus } from "./pageStatus";

describe("pageStatus", () => {
  it("is neutral up to two pages", () => {
    expect(pageStatus({ pages: 1, overflowing: [] })).toEqual({ text: "1 Seite", tone: "neutral" });
    expect(pageStatus({ pages: 2, overflowing: [] })).toEqual({ text: "2 Seiten", tone: "neutral" });
  });
  it("warns above two pages", () => {
    expect(pageStatus({ pages: 3, overflowing: [] })).toEqual({
      text: "3 Seiten — wählen Sie 12 pt oder blenden Sie Abschnitte aus",
      tone: "warning",
    });
  });
  it("flags overflowing sheets", () => {
    expect(pageStatus({ pages: 2, overflowing: [1] })).toEqual({ text: "Seite 2 ist zu voll", tone: "danger" });
  });
});
