// The daily medicine plan: what to take when, in plain words.
// Built from the structured `medications` of the analysis (doses exactly as printed).

import type { ItemCheck, Medication } from "../../api/types";
import { ReadAloudButton } from "../accessibility/ReadAloudButton";
import { speechLang } from "../accessibility/speech";
import { doseAmount, downloadMedicationIcs } from "../calendar/ics";

const SLOTS = ["morning", "noon", "evening", "night"] as const;
type Slot = (typeof SLOTS)[number];

const SLOT_LABEL: Record<"en" | "de", Record<Slot, string>> = {
  en: { morning: "Morning", noon: "Noon", evening: "Evening", night: "Night" },
  de: { morning: "Morgens", noon: "Mittags", evening: "Abends", night: "Zur Nacht" },
};
const SLOT_ICON: Record<Slot, string> = { morning: "☀️", noon: "🌤️", evening: "🌆", night: "🌙" };

const STATUS_BADGE: Partial<Record<Medication["status"], string>> = { new: "NEW", changed: "CHANGED" };

interface Props {
  medications: Medication[];
  checks: Record<string, ItemCheck>;
  targetLanguage: string;
  activeId: string | null;
  onSelect: (id: string) => void;
}

function unit(m: Medication): string {
  return /tabl|tablet/i.test(m.form ?? "") ? " tablet" : "";
}

export function MedicationSchedule({ medications, checks, targetLanguage, activeId, onSelect }: Props) {
  if (!medications.length) return null;
  const lang = speechLang(targetLanguage).startsWith("de") ? "de" : "en";
  const labels = SLOT_LABEL[lang];

  const active = medications.filter((m) => m.status !== "stopped");
  const stopped = medications.filter((m) => m.status === "stopped");
  const daily = (slot: Slot) => active.filter((m) => doseAmount(m[slot]) > 0);
  const other = active.filter((m) => SLOTS.every((s) => doseAmount(m[s]) === 0));

  const spoken = () => {
    const parts: string[] = [];
    for (const slot of SLOTS) {
      const list = daily(slot);
      if (list.length)
        parts.push(`${labels[slot]}: ${list.map((m) => `${m[slot]} ${m.name}${m.purpose ? `, ${m.purpose}` : ""}`).join(". ")}.`);
    }
    for (const m of other) parts.push(`${m.name}: ${m.instructions ?? m.schedule_text ?? ""}`);
    for (const m of stopped) parts.push(`${m.name}: ${m.instructions ?? (lang === "de" ? "Nicht einnehmen." : "Do not take it for now.")}`);
    return parts.join(" ");
  };

  const Row = ({ m, dose }: { m: Medication; dose?: string | null }) => {
    const check = checks[m.id];
    return (
      <li>
        <button
          type="button"
          className={`med ${activeId === m.id ? "is-active" : ""} ${check && !check.grounded ? "is-unverified" : ""}`}
          onClick={() => onSelect(m.id)}
          aria-label={`${dose ?? ""} ${m.name} ${m.strength ?? ""}. ${m.purpose ?? ""} ${m.instructions ?? ""}`}
        >
          <span className="med-main">
            {dose && <span className="med-dose">{dose}{unit(m)}</span>}
            <span className="med-name">{m.name}</span>
            {m.strength && <span className="med-strength">{m.strength}</span>}
            {STATUS_BADGE[m.status] && <span className={`badge med-${m.status}`}>{STATUS_BADGE[m.status]}</span>}
          </span>
          {m.purpose && <span className="med-purpose" dir="auto">{m.purpose}</span>}
          {m.instructions && <span className="med-instructions" dir="auto">{m.instructions}</span>}
          {check && !check.grounded && <span className="unverified">⛔ Not found as printed — check the document.</span>}
        </button>
      </li>
    );
  };

  return (
    <section className="card medication" aria-labelledby="med-title">
      <div className="card-head">
        <h2 id="med-title">Your medicine plan</h2>
        <ReadAloudButton text={spoken} targetLanguage={targetLanguage} />
      </div>
      <p className="hint">Exactly as printed on your document. Tap a medicine to see it on the page.</p>

      <div className="slots">
        {SLOTS.map((slot) => {
          const list = daily(slot);
          return (
            <div key={slot} className={`slot ${list.length ? "" : "is-empty"}`}>
              <h3>
                <span aria-hidden>{SLOT_ICON[slot]}</span> {labels[slot]}
              </h3>
              {list.length ? (
                <ul>{list.map((m) => <Row key={m.id} m={m} dose={m[slot]} />)}</ul>
              ) : (
                <p className="none">—</p>
              )}
            </div>
          );
        })}
      </div>

      {other.length > 0 && (
        <div className="med-other">
          <h3>Other times</h3>
          <ul>{other.map((m) => <Row key={m.id} m={m} />)}</ul>
        </div>
      )}

      {stopped.length > 0 && (
        <div className="med-stopped" role="note">
          <h3>⛔ Do not take for now</h3>
          <ul>{stopped.map((m) => <Row key={m.id} m={m} />)}</ul>
        </div>
      )}

      <div className="med-actions">
        <button type="button" className="btn secondary" onClick={() => downloadMedicationIcs(medications)}>
          ⏰ Add medicine reminders to calendar
        </button>
      </div>
      <p className="disclaimer-inline">Never stop or change a medicine without asking your doctor or pharmacist.</p>
    </section>
  );
}
