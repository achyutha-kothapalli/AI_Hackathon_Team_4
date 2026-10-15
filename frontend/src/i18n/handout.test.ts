import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LANGUAGES, dirFor, htmlLangFor, stringsFor } from "./handout";

function backendLanguages(): string[] {
  const py = readFileSync(
    new URL("../../../backend/app/domains/medical_document/__init__.py", import.meta.url),
    "utf8",
  );
  const tuple = /target_languages=\(([\s\S]*?)\),/.exec(py)![1];
  return [...tuple.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

describe("handout strings", () => {
  it("only offers languages the backend supports", () => {
    const backend = backendLanguages();
    for (const lang of LANGUAGES) expect(backend, lang).toContain(lang);
  });
  it("has every key, non-empty, in every language", () => {
    const keys = Object.keys(stringsFor("English")).sort();
    for (const lang of LANGUAGES) {
      const s = stringsFor(lang) as unknown as Record<string, string>;
      expect(Object.keys(s).sort(), lang).toEqual(keys);
      for (const k of keys) expect(s[k].trim(), `${lang}.${k}`).not.toBe("");
    }
  });
  it("falls back to English for unknown languages", () => {
    expect(stringsFor("Klingon")).toBe(stringsFor("English"));
    expect(dirFor("Klingon")).toBe("ltr");
    expect(htmlLangFor("Klingon")).toBe("en");
  });
  it("has no right-to-left languages", () => {
    expect(LANGUAGES.filter((l) => dirFor(l) === "rtl")).toEqual([]);
  });
  it("gives each language its own html lang", () => {
    expect(new Set(LANGUAGES.map(htmlLangFor)).size).toBe(LANGUAGES.length);
    expect(htmlLangFor("Einfache Sprache (simple German)")).toBe("de");
  });
  it("keeps the emergency number visible in every language", () => {
    for (const lang of LANGUAGES) expect(stringsFor(lang).emergencyTitle, lang).toContain("112");
  });
});
