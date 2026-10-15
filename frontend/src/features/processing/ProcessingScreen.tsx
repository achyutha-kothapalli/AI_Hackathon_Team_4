import { CheckCircle2, Circle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { StatusTag } from "../../components/StatusTag";
import "./processing.css";

const STEPS = ["Brief wird gelesen", "Wichtige Angaben werden gesucht", "Text in einfacher Sprache wird geschrieben"];
const REDACT_STEP = "Persönliche Angaben werden auf diesem Gerät geschwärzt";

interface Props {
  onCancel: () => void;
  sampleName?: string;
  /** Redaction runs first (on the device); its step completes when the upload starts. */
  redacting?: boolean;
  phase?: "redacting" | "analyzing";
}

/** Three plain steps while the analysis runs; steps 1–2 are timed hints, step 3 ends with the response. */
export function ProcessingScreen({ onCancel, sampleName, redacting = false, phase = "analyzing" }: Props) {
  const [timed, setTimed] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const steps = redacting ? [REDACT_STEP, ...STEPS] : STEPS;
  const uploading = phase === "analyzing";
  const done = (redacting && uploading ? 1 : 0) + timed;

  useEffect(() => {
    heading.current?.focus();
  }, []);

  // Timed hints for reading/finding start once the document is being analysed.
  useEffect(() => {
    if (!uploading) return;
    const t1 = setTimeout(() => setTimed(1), 1500);
    const t2 = setTimeout(() => setTimed(2), 4000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [uploading]);

  return (
    <main className="container narrow processing">
      <h1 ref={heading} tabIndex={-1}>
        Brief wird analysiert
      </h1>
      {sampleName && <p className="hint mono">{sampleName}</p>}
      <ol className="rows" aria-live="polite">
        {steps.map((step, i) => (
          <li key={step} className="row step">
            {i < done ? (
              <CheckCircle2 size={20} className="step-done" aria-hidden="true" />
            ) : (
              <Circle size={20} className="step-pending" aria-hidden="true" />
            )}
            <span>{step}</span>
            {i < done ? (
              <StatusTag tone="success">Fertig</StatusTag>
            ) : i === done ? (
              <StatusTag>Läuft</StatusTag>
            ) : null}
          </li>
        ))}
      </ol>
      <div>
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          Abbrechen
        </button>
      </div>
    </main>
  );
}
