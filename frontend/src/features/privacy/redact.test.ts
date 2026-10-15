import { describe, expect, it } from "vitest";
import type { OcrWord } from "../ocr/verifyHighlights";
import { findPersonalData } from "./redact";

// Build OCR words from text lines: one entry per line, words split on spaces.
function page(...lines: string[]): OcrWord[] {
  const words: OcrWord[] = [];
  lines.forEach((line, li) =>
    line.split(" ").forEach((text, wi) =>
      words.push({
        text,
        norm: text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ""),
        line: li,
        bbox: { x0: wi * 50, y0: li * 20, x1: wi * 50 + 40, y1: li * 20 + 15 },
      }),
    ),
  );
  return words;
}

const hidden = (words: OcrWord[]) => words.filter((w) => w.redacted).map((w) => w.text);

describe("findPersonalData", () => {
  it("hides the patient name and date of birth, keeps the label and medical content", () => {
    const words = page(
      "Patientin: Erika Mustermann, geb. 12.03.1948",
      "Stationärer Aufenthalt: 01.10.2026 bis 08.10.2026",
      "Ramipril 5 mg 1-0-1-0",
    );
    const found = findPersonalData([words]);
    expect(hidden(words)).toEqual(["Erika", "Mustermann,", "geb.", "12.03.1948"]);
    expect(found).toHaveLength(4);
  });

  it("hides the 'für:' line of a medication plan", () => {
    const words = page("für: Erika Mustermann geb. am: 12.03.1948", "Wirkstoff Stärke Form");
    findPersonalData([words]);
    expect(hidden(words)).toContain("Mustermann");
    expect(hidden(words)).toContain("12.03.1948");
    expect(hidden(words)).not.toContain("Wirkstoff");
  });

  it("hides the address block of a patient, not of a doctor", () => {
    const patient = page("Herrn", "Max Mustermann", "Beispielweg 12", "12345 Musterstadt", "Sehr geehrter Herr Mustermann,");
    findPersonalData([patient]);
    expect(hidden(patient)).toEqual(["Max", "Mustermann", "Beispielweg", "12", "12345", "Musterstadt", "Mustermann,"]);

    const doctor = page("Frau", "Dr. med. Anna Schmidt", "Hausarztpraxis", "Sehr geehrte Frau Kollegin,");
    findPersonalData([doctor]);
    expect(hidden(doctor)).toEqual([]);
  });

  it("hides insurance numbers and the name wherever else it appears", () => {
    const words = page(
      "Patient: Hans Beispiel",
      "Versichertennummer: A123456789",
      "Herr Beispiel wurde am 01.10.2026 aufgenommen.",
    );
    findPersonalData([words]);
    expect(hidden(words)).toEqual(expect.arrayContaining(["Hans", "Beispiel", "A123456789"]));
    expect(hidden(words).filter((t) => t === "Beispiel")).toHaveLength(2);
    expect(hidden(words)).not.toContain("01.10.2026");
  });
});
