// Data minimisation (Art. 5(1)(c) GDPR): find personal identifiers on the page
// with the browser's own OCR and black them out on a copy of the image BEFORE
// anything is uploaded. The original photo never leaves the device.
//
// What is hidden (German documents):
//   - the rest of a line after "Patient(in):", "Name:", "für:", "Versicherte(r):"
//   - dates after "geb.", "geboren", "Geburtsdatum"
//   - insurance and case numbers: KVNR (letter + 9 digits) and values after
//     "Versichertennummer", "Fallnummer", "Patienten-ID", "Aufnahmenummer", ...
//   - the name in "Sehr geehrte(r) Frau/Herr X" (not "Frau Kollegin" / "Herr Kollege")
//   - a postal address block that starts with a line "Herrn" / "Frau" (not a doctor)
//   - every other occurrence of a name found by the rules above
// What is kept: everything needed to explain the document (diagnoses, medicines,
// dates of the stay, follow-up dates, doctors and clinic contact details).

import type { BBox } from "../../api/types";
import type { OcrWord } from "../ocr/verifyHighlights";
import type { PreparedPage } from "../upload/preparePages";

export interface Redaction {
  page: number;
  rect: BBox; // 0..1000 page units, like the API
  reason: string;
}

const PERSON_MARKERS = new Set(["patient", "patientin", "name", "versicherter", "versicherte", "für", "pat"]);
const BIRTH_MARKERS = new Set(["geb", "geboren", "geburtsdatum", "gebdatum"]);
const ID_MARKERS = new Set([
  "versichertennummer", "versichertennr", "versichertenr", "kvnr", "fallnummer", "fallnr",
  "patientenid", "patientennummer", "pid", "aufnahmenummer", "aufnahmenr",
]);
const NOT_NAMES = new Set([
  "kollegin", "kollege", "dr", "doktor", "damen", "herren", "prof", "med", "am", "geb", "geboren",
  "frau", "herr", "herrn",
]);

function lines(words: OcrWord[]): OcrWord[][] {
  const byLine = new Map<number, OcrWord[]>();
  for (const w of words) byLine.set(w.line, [...(byLine.get(w.line) ?? []), w]);
  return [...byLine.values()];
}

const isNameWord = (w: OcrWord) => /^\p{Lu}/u.test(w.text) && w.norm.length >= 2 && !NOT_NAMES.has(w.norm);
const hasDigit = (w: OcrWord) => /\d/.test(w.text);

/** Find personal identifiers. Marks matching OCR words as `redacted`. */
export function findPersonalData(ocr: OcrWord[][]): Redaction[] {
  const hidden = new Map<OcrWord, string>();
  const names = new Set<string>();
  const hide = (w: OcrWord, reason: string) => hidden.set(w, hidden.get(w) ?? reason);

  ocr.forEach((words) => {
    const ls = lines(words);
    ls.forEach((line, li) => {
      line.forEach((w, i) => {
        const rest = line.slice(i + 1);
        // "Patientin: Erika Mustermann, geb. 12.03.1948" / "für: Erika Mustermann ..."
        if (PERSON_MARKERS.has(w.norm) && /:$/.test(w.text.trim()) && rest.length) {
          rest.forEach((r) => {
            hide(r, "name / date of birth");
            if (isNameWord(r) && !hasDigit(r)) names.add(r.norm);
          });
        }
        // "geb. 12.03.1948", "geboren am 12.03.1948", "Geburtsdatum: 12.03.1948"
        if (BIRTH_MARKERS.has(w.norm)) {
          rest.slice(0, 3).filter(hasDigit).forEach((r) => hide(r, "date of birth"));
        }
        // "Versichertennummer: A123456789", "Fall-Nr. 2026-1234"
        if (ID_MARKERS.has(w.norm.replace(/-/g, ""))) {
          rest.slice(0, 2).filter(hasDigit).forEach((r) => hide(r, "insurance / case number"));
        }
        // KVNR: one capital letter + 9 digits
        if (/^[A-Z]\d{9}$/.test(w.text.replace(/[^\w]/g, ""))) hide(w, "insurance number");
        // "Sehr geehrte Frau Mustermann,"
        if ((w.norm === "frau" || w.norm === "herr") && line[i - 1]?.norm.startsWith("geehrte")) {
          for (const r of rest) {
            if (!isNameWord(r)) break;
            hide(r, "name");
            names.add(r.norm);
            if (/,$/.test(r.text)) break;
          }
        }
      });
      // Address block: a line that is only "Herrn" or "Frau", followed by name, street, city
      if (line.length === 1 && (line[0].norm === "herrn" || line[0].norm === "frau")) {
        const next = ls[li + 1];
        if (next && next[0] && !["dr", "prof"].includes(next[0].norm)) {
          ls.slice(li + 1, li + 4).forEach((l, k) =>
            l.forEach((r) => {
              hide(r, k === 0 ? "name" : "address");
              if (k === 0 && isNameWord(r)) names.add(r.norm);
            }),
          );
        }
      }
    });
  });

  // The same name elsewhere in the document (e.g. "Frau Mustermann wurde ...").
  ocr.flat().forEach((w) => {
    if (names.has(w.norm) && w.norm.length >= 3) hide(w, "name");
  });

  const out: Redaction[] = [];
  ocr.forEach((words, page) => {
    for (const w of words) {
      const reason = hidden.get(w);
      if (!reason) continue;
      w.redacted = true;
      out.push({ page, rect: w.bbox, reason });
    }
  });
  return out;
}

/** Copies of the pages with every redaction blacked out (same size, so highlights still line up). */
export async function applyRedactions(pages: PreparedPage[], redactions: Redaction[]): Promise<PreparedPage[]> {
  return Promise.all(
    pages.map(async (page, i) => {
      const mine = redactions.filter((r) => r.page === i);
      if (!mine.length) return page;
      const bitmap = await createImageBitmap(page.blob);
      const canvas = document.createElement("canvas");
      canvas.width = page.width;
      canvas.height = page.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0, page.width, page.height);
      bitmap.close();
      ctx.fillStyle = "#000";
      const pad = 4;
      for (const { rect } of mine) {
        const x = (rect.x0 / 1000) * page.width - pad;
        const y = (rect.y0 / 1000) * page.height - pad;
        ctx.fillRect(x, y, ((rect.x1 - rect.x0) / 1000) * page.width + 2 * pad, ((rect.y1 - rect.y0) / 1000) * page.height + 2 * pad);
      }
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode image."))), "image/jpeg", 0.9),
      );
      return { ...page, id: `${page.id}-redacted`, blob, url: URL.createObjectURL(blob) };
    }),
  );
}

/** Short human summary, e.g. "name, date of birth (4 places)". */
export function describe(redactions: Redaction[]): string {
  const kinds = [...new Set(redactions.map((r) => r.reason))];
  return `${kinds.join(", ")} (${redactions.length} ${redactions.length === 1 ? "place" : "places"})`;
}
