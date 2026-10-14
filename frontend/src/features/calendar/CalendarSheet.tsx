import { useState } from "react";
import type { AnalysisResult } from "../../api/types";
import { formatDate } from "../../lib/kinds";
import { Icon } from "../../ui/Icon";
import { Sheet } from "../../ui/Sheet";
import { datedItems, downloadIcs, googleCalendarUrl } from "./ics";

const REMINDERS = [
  [1, "1 day before"],
  [3, "3 days before"],
  [7, "1 week before"],
] as const;

interface Props {
  result: AnalysisResult;
  onAdded: () => void;
  onClose: () => void;
}

export function CalendarSheet({ result, onAdded, onClose }: Props) {
  const items = datedItems(result);
  const [days, setDays] = useState<number>(3);
  const first = items[0];

  return (
    <Sheet title="Add reminder" onClose={onClose}>
      {items.map((item) => {
        const d = new Date(`${item.date}T00:00:00`);
        return (
          <div key={item.id} className="event-preview">
            <span className="event-tile">
              <span className="dt-month">{d.toLocaleDateString("en-GB", { month: "short" })}</span>
              <span className="dt-day">{d.getDate()}</span>
            </span>
            <div>
              <div className="event-title" dir="auto">
                {item.label}
              </div>
              <div className="event-when">{formatDate(item.date!, "en-GB")} · All day</div>
            </div>
          </div>
        );
      })}
      <h3 className="eyebrow">Remind me</h3>
      <div className="chip-group" role="radiogroup">
        {REMINDERS.map(([d, label]) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={d === days}
            className={`choice ${d === days ? "is-selected" : ""}`}
            onClick={() => setDays(d)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="cal-buttons">
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => {
            downloadIcs(items, result, [days]);
            onAdded();
          }}
        >
          <Icon name="download" />
          Apple / Outlook (.ics)
        </button>
        {first && (
          <a
            className="btn btn-secondary btn-block"
            href={googleCalendarUrl(first, result)}
            target="_blank"
            rel="noreferrer"
            onClick={onAdded}
          >
            <Icon name="calendar" />
            Google Calendar{items.length > 1 ? " (first date)" : ""}
          </a>
        )}
      </div>
    </Sheet>
  );
}
