import { useState, type KeyboardEvent } from "react";
import type { Meta, ProfileInfo, SampleInfo } from "../../api/types";
import { Banner } from "../../components/Banner";
import { SectionHead } from "../../components/SectionHead";
import type { PreparedPage } from "../upload/preparePages";
import { DropZone } from "./DropZone";
import "./start.css";

/** The slice of `useAnalysis()` this screen uses; structurally compatible with its return value. */
export interface StartProps {
  meta: Meta;
  domain: ProfileInfo | undefined;
  languages: string[];
  targetLanguage: string;
  setTargetLanguage: (language: string) => void;
  pages: PreparedPage[];
  status: "idle" | "preparing" | "analyzing" | "done";
  error: string | null;
  samples: SampleInfo[];
  trySample: (id: string) => unknown;
  addFiles: (files: File[]) => unknown;
  removePage: (id: string) => void;
  movePage: (id: string, delta: -1 | 1) => void;
  needsConsent: boolean;
  consent: boolean;
  setConsent: (value: boolean) => void;
  analyze: () => unknown;
}

// Only these two handout languages are offered for now (value = backend language name).
const LANGUAGE_LABEL: Record<string, string> = {
  "Einfache Sprache (simple German)": "Einfache Sprache",
  English: "Englisch",
};

const SAMPLE_LABEL: Record<string, string> = {
  entlassbrief: "Entlassbrief (Beispiel)",
  medikationsplan: "Medikationsplan (Beispiel)",
};

export function StartScreen({ a }: { a: StartProps }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const busy = a.status === "preparing" || a.status === "analyzing";
  const { provider, region, eu } = a.meta.processing;
  const offered = a.languages.filter((l) => l in LANGUAGE_LABEL);
  const languages = offered.length ? offered : Object.keys(LANGUAGE_LABEL);
  const consentText = (a.domain?.privacy.consent_text ?? "")
    .replace("{provider}", provider)
    .replace("{region}", region);

  const pick = (id: string) => {
    if (busy) return;
    setChosen(id);
    void a.trySample(id);
  };
  const onRowKey = (e: KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(id);
    }
  };

  return (
    <main className="container start-screen">
      <header className="start-head">
        <h1>Entlassbrief verständlich machen</h1>
        <p className="start-lead muted">
          Laden Sie einen Entlassbrief oder Medikationsplan hoch. Sie erhalten ein Patientenblatt in einfacher
          Sprache zum Ausdrucken.
        </p>
      </header>

      <section>
        <SectionHead marker="01">Sprache des Patientenblatts</SectionHead>
        <div className="field">
          <label className="label" htmlFor="lang">
            Sprache
          </label>
          <select
            id="lang"
            className="select"
            value={a.targetLanguage}
            onChange={(e) => a.setTargetLanguage(e.target.value)}
            disabled={busy}
          >
            {languages.map((l) => (
              <option key={l} value={l}>
                {LANGUAGE_LABEL[l] ?? l}
              </option>
            ))}
          </select>
          <p className="hint">Die Sprache wird vor der Analyse gewählt. Ein Wechsel später startet eine neue Analyse.</p>
        </div>
      </section>

      <section>
        <SectionHead marker="02">Brief hochladen</SectionHead>
        <DropZone
          pages={a.pages}
          maxPages={a.meta.max_pages}
          busy={busy}
          onAddFiles={(files) => {
            setChosen(null);
            void a.addFiles(files);
          }}
          onRemove={a.removePage}
          onMove={a.movePage}
        />
        {a.error && (
          <Banner tone="danger" role="alert" title="Das hat nicht geklappt">
            {a.error}
          </Banner>
        )}
        {a.samples.length > 0 && (
          <div className="samples">
            <p className="label" id="samples-label">
              Oder ein Beispiel verwenden
            </p>
            <ul className="rows" role="radiogroup" aria-labelledby="samples-label">
              {a.samples.map((s) => {
                const checked = chosen === s.id && a.pages.length > 0;
                return (
                  <li
                    key={s.id}
                    className="row sample-row"
                    role="radio"
                    aria-checked={checked}
                    aria-disabled={busy || undefined}
                    tabIndex={0}
                    onClick={() => pick(s.id)}
                    onKeyDown={(e) => onRowKey(e, s.id)}
                  >
                    <span className="sample-radio" aria-hidden="true" />
                    {SAMPLE_LABEL[s.id] ?? s.label}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {a.needsConsent && (
        <section>
          <SectionHead marker="03">Einwilligung</SectionHead>
          <label className="checkbox">
            <input type="checkbox" checked={a.consent} onChange={(e) => a.setConsent(e.target.checked)} />
            <span>{consentText}</span>
          </label>
          {a.domain?.privacy.recommend_eu_processing && !eu && (
            <Banner tone="warning">
              Der KI-Dienst verarbeitet Daten außerhalb der EU ({region}). Für Gesundheitsdaten wird ein EU-Anbieter
              empfohlen.
            </Banner>
          )}
        </section>
      )}

      <div className="start-submit">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!a.pages.length || a.status !== "idle" || (a.needsConsent && !a.consent)}
          onClick={() => void a.analyze()}
        >
          Brief analysieren
        </button>
        <p className="hint">
          Verarbeitung: {provider} · {region}. Diese App speichert nichts.
        </p>
      </div>
    </main>
  );
}
