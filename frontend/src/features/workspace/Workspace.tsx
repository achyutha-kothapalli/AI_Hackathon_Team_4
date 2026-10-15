import { Lock, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { Banner } from "../../components/Banner";
import { StatusTag } from "../../components/StatusTag";
import { LANGUAGES } from "../../i18n/handout";
import type { Analysis } from "../analysis/useAnalysis";
import { needsAttention } from "../analysis/screen";
import { Handout } from "../handout/Handout";
import { DEFAULT_SETTINGS, buildHandout } from "../handout/model";
import { HandoutSettings } from "./HandoutSettings";
import { pageStatus, type PageLayout } from "./pageStatus";
import "./workspace.css";

/** Handout-only workspace: settings left, live A4 preview right, one print action. */
export function Workspace({ a }: { a: Analysis }) {
  const res = a.response!;
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [layout, setLayout] = useState<PageLayout | null>(null);
  const model = useMemo(() => buildHandout(res.result, settings), [res, settings]);
  const languages = a.languages.filter((l) => (LANGUAGES as readonly string[]).includes(l));
  const status = layout ? pageStatus(layout) : null;

  return (
    <main className="workspace container">
      <header className="workspace-head">
        <div>
          <h1>Patientenblatt</h1>
          <p className="muted">
            {res.result.document_type}
            {res.result.sender ? ` · ${res.result.sender}` : ""}
          </p>
        </div>
        <div className="workspace-actions">
          {status && <StatusTag tone={status.tone}>{status.text}</StatusTag>}
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={16} aria-hidden="true" />
            Drucken / Als PDF speichern
          </button>
        </div>
      </header>

      {a.error && (
        <Banner tone="danger" role="alert" title="Das hat nicht geklappt">
          {a.error}
        </Banner>
      )}
      {a.redactions && a.sentPages && (
        <details className="sent-version">
          <summary>
            <Lock size={16} aria-hidden="true" />
            {a.redactions.length} persönliche {a.redactions.length === 1 ? "Angabe" : "Angaben"} vor dem Senden
            geschwärzt – gesendete Version ansehen
          </summary>
          <p className="muted">
            Nur diese Version wurde an den KI-Dienst gesendet ({a.meta.processing.provider}). Das Originalfoto hat
            dieses Gerät nicht verlassen.
          </p>
          <div className="sent-pages">
            {a.sentPages.map((p, i) => (
              <img key={p.id} src={p.url} alt={`Gesendete Seite ${i + 1} mit geschwärzten persönlichen Angaben`} />
            ))}
          </div>
        </details>
      )}
      {needsAttention(res) && (
        <Banner tone="warning" title="Bitte vor dem Drucken prüfen">
          {res.result.confidence_note ??
            "Die Sicherheitsprüfung hat wichtige Hinweise gefunden. Vergleichen Sie das Blatt mit dem Brief."}
        </Banner>
      )}

      <div className="workspace-grid">
        <HandoutSettings
          settings={settings}
          onChange={setSettings}
          language={res.result.target_language}
          languages={languages}
          busy={a.status === "analyzing"}
          onChangeLanguage={(l) => void a.reanalyze(l)}
        />
        <Handout model={model} onLayout={setLayout} />
      </div>
    </main>
  );
}
