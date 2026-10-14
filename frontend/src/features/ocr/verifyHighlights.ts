// Independent check of the AI's answer, run in the browser with Tesseract.
//
// The model reports *where* each fact is printed (bbox) and the exact text it
// read (source_quote). We OCR the page ourselves and look for that quote near
// that spot. If found, the highlight snaps to the real word boxes and the item
// is marked "verified" — the user can see the AI didn't make the fact up.

import type { BBox, KeyItem, TextBlock } from "../../api/types";
import type { PreparedPage } from "../upload/preparePages";

export interface OcrWord {
  text: string;
  norm: string;
  line: number;
  bbox: BBox; // normalised to 0..1000 like the API
}

export interface Verification {
  verified: boolean;
  rects: BBox[]; // one rect per matched text line
  score: number;
}

const TESSERACT_LANGS: Record<string, string> = {
  German: "deu",
  English: "eng",
  French: "fra",
  Spanish: "spa",
  Italian: "ita",
  Dutch: "nld",
  Polish: "pol",
};

export function ocrLanguageFor(sourceLanguage: string): string {
  return TESSERACT_LANGS[sourceLanguage] ?? "eng";
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, "");

/** OCR all pages. Returns words per page index. */
export async function ocrPages(pages: PreparedPage[], lang: string): Promise<OcrWord[][]> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(lang);
  try {
    const out: OcrWord[][] = [];
    for (const page of pages) {
      const { data } = await worker.recognize(page.blob, {}, { blocks: true });
      const words: OcrWord[] = [];
      let line = 0;
      for (const block of data.blocks ?? []) {
        for (const para of block.paragraphs) {
          for (const l of para.lines) {
            for (const w of l.words) {
              const norm = normalize(w.text);
              if (!norm) continue;
              words.push({
                text: w.text,
                norm,
                line,
                bbox: {
                  x0: (w.bbox.x0 / page.width) * 1000,
                  y0: (w.bbox.y0 / page.height) * 1000,
                  x1: (w.bbox.x1 / page.width) * 1000,
                  y1: (w.bbox.y1 / page.height) * 1000,
                },
              });
            }
            line++;
          }
        }
      }
      out.push(words);
    }
    return out;
  } finally {
    await worker.terminate();
  }
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  // Levenshtein ratio — tolerant of OCR mistakes like "0" vs "O".
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return 1 - prev[b.length] / Math.max(a.length, b.length);
}

function center(b: BBox) {
  return { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 };
}

function rectsByLine(words: OcrWord[]): BBox[] {
  const lines = new Map<number, BBox>();
  for (const w of words) {
    const r = lines.get(w.line);
    lines.set(
      w.line,
      r
        ? {
            x0: Math.min(r.x0, w.bbox.x0),
            y0: Math.min(r.y0, w.bbox.y0),
            x1: Math.max(r.x1, w.bbox.x1),
            y1: Math.max(r.y1, w.bbox.y1),
          }
        : { ...w.bbox },
    );
  }
  const pad = 3;
  return [...lines.values()].map((r) => ({
    x0: r.x0 - pad,
    y0: r.y0 - pad,
    x1: r.x1 + pad,
    y1: r.y1 + pad,
  }));
}

/** Find `quote` in the page's OCR words, preferring matches near `hint`. */
export function locateQuote(quote: string, words: OcrWord[], hint: BBox): Verification | null {
  const tokens = quote.split(/\s+/).map(normalize).filter(Boolean);
  if (!tokens.length || !words.length) return null;

  const hintC = center(hint);
  let best: { score: number; start: number } | null = null;
  for (let start = 0; start + tokens.length <= words.length; start++) {
    let sum = 0;
    for (let k = 0; k < tokens.length; k++) sum += similarity(tokens[k], words[start + k].norm);
    const textScore = sum / tokens.length;
    if (textScore < 0.7) continue;
    // Penalise matches far from where the model said the text is, to pick
    // the right one when a phrase appears more than once.
    const c = center(words[start].bbox);
    const dist = Math.hypot(c.x - hintC.x, c.y - hintC.y) / 1414;
    const score = textScore - 0.3 * dist;
    if (!best || score > best.score) best = { score, start };
  }
  if (!best) return null;
  const matched = words.slice(best.start, best.start + tokens.length);
  return { verified: true, rects: rectsByLine(matched), score: best.score };
}

export interface Coverage {
  ratio: number; // share of words on the photo that appear in the AI's transcription
  missing: string[]; // examples of words on the photo the AI did not transcribe
}

/**
 * "Nothing lost" check, independent of the AI: every readable word OCR finds on
 * the photo should appear in the transcribed blocks. Returns null when OCR read
 * too little text to judge.
 */
export function textCoverage(ocr: OcrWord[][], blocks: TextBlock[]): Coverage | null {
  const transcribed = new Set(blocks.flatMap((b) => b.original.split(/\s+/).map(normalize)).filter(Boolean));
  const list = [...transcribed];
  const words = ocr.flat().filter((w) => w.norm.length >= 4 && /\p{L}/u.test(w.norm));
  if (words.length < 20) return null;
  const missing: string[] = [];
  let hit = 0;
  for (const w of words) {
    if (transcribed.has(w.norm) || list.some((t) => similarity(w.norm, t) >= 0.8)) hit++;
    else if (!missing.includes(w.text)) missing.push(w.text);
  }
  return { ratio: hit / words.length, missing: missing.slice(0, 8) };
}

export function verifyItems(items: KeyItem[], ocr: OcrWord[][]): Record<string, Verification> {
  const out: Record<string, Verification> = {};
  for (const item of items) {
    const match = locateQuote(item.source_quote, ocr[item.page] ?? [], item.bbox);
    out[item.id] = match ?? { verified: false, rects: [item.bbox], score: 0 };
  }
  return out;
}
