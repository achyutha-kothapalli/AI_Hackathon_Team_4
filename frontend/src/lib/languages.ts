// Display data for the target languages the backend offers (/api/meta).
// The backend speaks in English names ("Arabic"); this adds the native name,
// a BCP 47 tag for lang="" and the writing direction.

interface LanguageInfo {
  name: string;
  native: string;
  tag: string;
  rtl: boolean;
}

const KNOWN: Record<string, Omit<LanguageInfo, "name">> = {
  English: { native: "English", tag: "en", rtl: false },
  Arabic: { native: "العربية", tag: "ar", rtl: true },
  Turkish: { native: "Türkçe", tag: "tr", rtl: false },
  Ukrainian: { native: "Українська", tag: "uk", rtl: false },
  Russian: { native: "Русский", tag: "ru", rtl: false },
  Spanish: { native: "Español", tag: "es", rtl: false },
  French: { native: "Français", tag: "fr", rtl: false },
  Hindi: { native: "हिन्दी", tag: "hi", rtl: false },
  Telugu: { native: "తెలుగు", tag: "te", rtl: false },
  Persian: { native: "فارسی", tag: "fa", rtl: true },
  Polish: { native: "Polski", tag: "pl", rtl: false },
  "Simplified Chinese": { native: "简体中文", tag: "zh-Hans", rtl: false },
};

export function languageInfo(name: string): LanguageInfo {
  const known = KNOWN[name];
  return known ? { name, ...known } : { name, native: name, tag: "und", rtl: false };
}

/** Short code for the top bar button, e.g. "AR". */
export function languageCode(name: string): string {
  const { tag } = languageInfo(name);
  return (tag === "und" ? name.slice(0, 2) : tag.split("-")[0]).toUpperCase();
}

/** Attributes for content written in `name`. */
export function contentAttrs(name: string): { lang: string; dir: "rtl" | "ltr" } {
  const info = languageInfo(name);
  return { lang: info.tag, dir: info.rtl ? "rtl" : "ltr" };
}
