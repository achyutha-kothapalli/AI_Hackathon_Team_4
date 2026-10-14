import { useEffect, useState } from "react";
import { Icon } from "../../ui/Icon";

// The backend reports no progress, so the first two steps tick off on a
// conservative timer and the last stays active until the answer arrives.
const STEPS = [
  { label: "Reading the letter…", doneAfter: 8 },
  { label: "Translating…", doneAfter: 20 },
  { label: "Finding what you need to do…", doneAfter: Infinity },
];

interface Props {
  previewUrl: string | null;
  onCancel: () => void;
}

export function ProcessingScreen({ previewUrl, onCancel }: Props) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const active = STEPS.findIndex((s) => seconds < s.doneAfter);
  const elapsed = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="screen processing">
      <div className="scan">
        {previewUrl ? (
          <img src={previewUrl} alt="" />
        ) : (
          <div className="proc-paper">
            <span />
            <span />
            <span className="short" />
            <span />
            <span />
            <span className="short" />
          </div>
        )}
        <div className="scan-line" />
      </div>
      <h1 className="h2 center">Understanding your letter</h1>
      <ul className="proc-steps" role="status">
        {STEPS.map((s, i) => {
          const state = i < active ? "done" : i === active ? "active" : "";
          return (
            <li key={s.label} className={state}>
              <span className="proc-icon">
                {state === "done" ? <Icon name="check" /> : <span className="spinner" />}
              </span>
              {s.label}
            </li>
          );
        })}
      </ul>
      <p className="proc-elapsed" aria-label={`${seconds} seconds elapsed`}>
        {elapsed}
      </p>
      <p className="proc-note">This can take 1–2 minutes. Keep this page open.</p>
      <button type="button" className="btn btn-ghost" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
