import { useEffect, useRef } from "react";
import { Banner } from "../../components/Banner";
import "./processing.css";

const TIPS = [
  "Legen Sie die Seite flach auf einen Tisch.",
  "Sorgen Sie für gutes Licht ohne Schatten.",
  "Fotografieren Sie die ganze Seite von oben.",
  "Halten Sie das Telefon still, bis das Bild scharf ist.",
];

interface Props {
  onRetry: () => void;
  onUseSample: () => void;
}

export function ReadErrorScreen({ onRetry, onUseSample }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  return (
    <main className="container narrow processing">
      <h1 ref={heading} tabIndex={-1}>
        Wir konnten den Brief nicht gut lesen
      </h1>
      <Banner tone="warning">Das Foto ist zu unscharf, zu dunkel oder abgeschnitten.</Banner>
      <ul className="rows">
        {TIPS.map((tip) => (
          <li key={tip} className="row">
            {tip}
          </li>
        ))}
      </ul>
      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Erneut versuchen
        </button>
        <button type="button" className="btn btn-outline" onClick={onUseSample}>
          Beispiel verwenden
        </button>
      </div>
    </main>
  );
}
