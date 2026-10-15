// Builds an .ics calendar file for dated key items (deadlines, appointments).
// Generated client-side: no server state, works with Google/Apple/Outlook.

import type { AnalysisResult, KeyItem, Medication } from "../../api/types";

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

// ---------------------------------------------------------------- medication reminders

const SLOT_TIMES = [
  ["morning", "080000"],
  ["noon", "120000"],
  ["evening", "180000"],
  ["night", "220000"],
] as const;

const WEEKDAYS: Record<string, string> = {
  montag: "MO", monday: "MO", dienstag: "TU", tuesday: "TU", mittwoch: "WE", wednesday: "WE",
  donnerstag: "TH", thursday: "TH", freitag: "FR", friday: "FR", samstag: "SA", saturday: "SA",
  sonntag: "SU", sunday: "SU",
};

/** Dose as printed -> number (0 if empty). */
export function doseAmount(v: string | null): number {
  if (!v || !v.trim()) return 0;
  const t = v.trim();
  if (t === "½" || t === "1/2") return 0.5;
  if (t === "¼" || t === "1/4") return 0.25;
  if (t === "¾" || t === "3/4") return 0.75;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function localDate(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

/** "bis einschließlich 12.10.2026" -> 20261012T235900 (end of that day). */
function untilFrom(scheduleText: string | null): string | null {
  const m = scheduleText?.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  return m ? `${m[3]}${m[2].padStart(2, "0")}${m[1].padStart(2, "0")}T235900` : null;
}

function weekday(scheduleText: string | null): string | null {
  const t = (scheduleText ?? "").toLowerCase();
  if (!/wöchentlich|weekly|once a week/.test(t)) return null;
  const key = Object.keys(WEEKDAYS).find((d) => t.includes(d));
  return key ? WEEKDAYS[key] : null;
}

/** Recurring reminders for each active medicine: daily per intake time, or weekly. */
export function buildMedicationIcs(meds: Medication[]): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const start = localDate(tomorrow);
  const events: string[][] = [];

  const event = (summary: string, description: string, time: string, rrule: string) => [
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@briefverstehen`,
    `DTSTAMP:${stamp()}`,
    `DTSTART:${start}T${time}`,
    "DURATION:PT10M",
    rrule,
    `SUMMARY:${escape(summary)}`,
    `DESCRIPTION:${escape(description)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escape(summary)}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
  ];

  for (const m of meds) {
    if (m.status === "stopped") continue;
    const what = [m.name, m.strength].filter(Boolean).join(" ");
    const description = [m.purpose, m.instructions, `As printed: "${m.source_quote}"`].filter(Boolean).join("\n");
    const until = untilFrom(m.schedule_text);
    const day = weekday(m.schedule_text);
    if (day) {
      events.push(event(`💊 ${what}`, description, "080000", `RRULE:FREQ=WEEKLY;BYDAY=${day};COUNT=12`));
      continue;
    }
    for (const [slot, time] of SLOT_TIMES) {
      const amount = doseAmount(m[slot]);
      if (amount > 0) {
        const rrule = until ? `RRULE:FREQ=DAILY;UNTIL=${until}` : "RRULE:FREQ=DAILY;COUNT=30";
        events.push(event(`💊 ${what}: take ${m[slot]}`, description, time, rrule));
      }
    }
  }
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//BriefVerstehen//EN", "CALSCALE:GREGORIAN", ...events.flat(), "END:VCALENDAR"]
    .map(fold)
    .join("\r\n");
}

export function downloadMedicationIcs(meds: Medication[]) {
  const blob = new Blob([buildMedicationIcs(meds)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "medicine-reminders.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
