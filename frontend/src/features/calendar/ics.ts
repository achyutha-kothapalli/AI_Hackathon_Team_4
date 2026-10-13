// Builds an .ics calendar file for dated key items (deadlines, appointments).
// Generated client-side: no server state, works with Google/Apple/Outlook.

import type { AnalysisResult, KeyItem } from "../../api/types";

const escape = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

/** RFC 5545 lines must be folded at 75 octets. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (new TextEncoder().encode(rest).length > 75) {
    let cut = 74;
    while (new TextEncoder().encode(rest.slice(0, cut)).length > 74) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
}

const ymd = (iso: string) => iso.replace(/-/g, "");

function nextDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function stamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function datedItems(result: AnalysisResult): KeyItem[] {
  return result.key_items.filter((k) => k.date && /^\d{4}-\d{2}-\d{2}$/.test(k.date));
}

export function buildIcs(items: KeyItem[], result: AnalysisResult): string {
  const refs = result.key_items
    .filter((k) => k.kind === "reference")
    .map((k) => `${k.label}: ${k.value}`)
    .join("\n");

  const events = items.map((item) => {
    const description = [
      item.explanation,
      `Value: ${item.value}`,
      `Original text: "${item.source_quote}"`,
      refs && `\n${refs}`,
      `\nFrom: ${result.sender ?? result.document_type}`,
    ]
      .filter(Boolean)
      .join("\n");
    return [
      "BEGIN:VEVENT",
      `UID:${crypto.randomUUID()}@briefverstehen`,
      `DTSTAMP:${stamp()}`,
      `DTSTART;VALUE=DATE:${ymd(item.date!)}`,
      `DTEND;VALUE=DATE:${ymd(nextDay(item.date!))}`,
      `SUMMARY:${escape(`${item.label} – ${result.document_type}`)}`,
      `DESCRIPTION:${escape(description)}`,
      // Reminders 3 days and 1 day before.
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escape(item.label)}`,
      "TRIGGER:-P3D",
      "END:VALARM",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escape(item.label)}`,
      "TRIGGER:-P1D",
      "END:VALARM",
      "END:VEVENT",
    ];
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BriefVerstehen//EN",
    "CALSCALE:GREGORIAN",
    ...events.flat(),
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n");
}

export function downloadIcs(items: KeyItem[], result: AnalysisResult) {
  const blob = new Blob([buildIcs(items, result)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = items.length === 1 ? `${items[0].label}.ics` : "deadlines.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
