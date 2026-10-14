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

function eventTitle(item: KeyItem, result: AnalysisResult): string {
  return `${item.label} – ${result.document_type}`;
}

export function buildIcs(items: KeyItem[], result: AnalysisResult, reminderDays: number[] = [3, 1]): string {
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
      `SUMMARY:${escape(eventTitle(item, result))}`,
      `DESCRIPTION:${escape(description)}`,
      // One reminder per chosen lead time (default: 3 days and 1 day before).
      ...reminderDays.flatMap((days) => [
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escape(item.label)}`,
        `TRIGGER:-P${days}D`,
        "END:VALARM",
      ]),
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

export function downloadIcs(items: KeyItem[], result: AnalysisResult, reminderDays?: number[]) {
  const blob = new Blob([buildIcs(items, result, reminderDays)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = items.length === 1 ? `${items[0].label}.ics` : "deadlines.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Google Calendar "new event" link for one all-day item. */
export function googleCalendarUrl(item: KeyItem, result: AnalysisResult): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: eventTitle(item, result),
    dates: `${ymd(item.date!)}/${ymd(nextDay(item.date!))}`,
    details: `${item.explanation}\n\nOriginal text: "${item.source_quote}"\n\nExplained by BriefVerstehen. Always check the original letter.`,
    ctz: "Europe/Berlin",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
