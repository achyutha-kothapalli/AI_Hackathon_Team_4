import type { AnalysisResult, KeyItem } from "../../api/types";
import { daysUntil } from "../../lib/kinds";

export type Urgency = "red" | "amber" | "blue";

/** ISO due date of an item: its `date`, else a German date in its value
 * ("bis 02.11.2026") — models sometimes leave `date` empty. */
export function dueDate(item: KeyItem): string | null {
  if (item.date) return item.date;
  const m = item.value.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}

/** The deadline that matters most: the next upcoming dated one, else an
 * undated one ("within 48 hours"), else the latest overdue one. A past date
 * ranks last because it is often the letter's own date, mislabelled. */
export function primaryDeadline(result: AnalysisResult): KeyItem | null {
  const deadlines = result.key_items.filter((k) => k.kind === "deadline");
  const dated = deadlines.filter((k) => dueDate(k)).sort((a, b) => dueDate(a)!.localeCompare(dueDate(b)!));
  const undated = deadlines.filter((k) => !dueDate(k));
  return (
    dated.find((k) => daysUntil(dueDate(k)!) >= 0) ??
    undated.find((k) => k.importance === "high") ??
    undated[0] ??
    dated[dated.length - 1] ??
    null
  );
}

export function urgency(days: number): Urgency {
  if (days <= 7) return "red";
  if (days <= 21) return "amber";
  return "blue";
}

export function countdownText(days: number): string {
  if (days < 0) return `${-days} day${days === -1 ? "" : "s"} overdue`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

/** Status pill for list rows (home "continue" card). */
export function deadlinePill(result: AnalysisResult) {
  const d = primaryDeadline(result);
  if (!d) {
    return (
      <span className="pill u-blue">
        <span className="dot" />
        No deadline found
      </span>
    );
  }
  const due = dueDate(d);
  if (!due) {
    return (
      <span className="pill u-red">
        <span className="dot" />
        {d.value}
      </span>
    );
  }
  const n = daysUntil(due);
  return (
    <span className={`pill u-${urgency(n)}`}>
      <span className="dot" />
      {countdownText(n)}
    </span>
  );
}
