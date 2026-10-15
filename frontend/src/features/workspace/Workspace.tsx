import { Columns2, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { Banner } from "../../components/Banner";
import { StatusTag } from "../../components/StatusTag";
import { LANGUAGES } from "../../i18n/handout";
import type { Analysis } from "../analysis/useAnalysis";
import { needsAttention } from "../analysis/screen";
import { highlightItems } from "../../lib/highlights";
import { DocumentViewer } from "../viewer/DocumentViewer";
import { Handout } from "../handout/Handout";
import { DEFAULT_SETTINGS, buildHandout } from "../handout/model";
import { HandoutSettings } from "./HandoutSettings";
import { pageStatus, type PageLayout } from "./pageStatus";
import "./workspace.css";

/** Staff workspace: settings, the original with numbered highlights, and the live A4 preview, linked by number. */
export function Workspace({ a }: { a: Analysis }) {
  const res = a.response!;
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [layout, setLayout] = useState<PageLayout | null>(null);
  const model = useMemo(() => buildHandout(res.result, settings), [res, settings]);
  const languages = a.languages.filter((l) => (LANGUAGES as readonly string[]).includes(l));
  const status = layout ? pageStatus(layout) : null;
  const items = useMemo(() => highlightItems(res.result), [res]);
  const hasOriginal = a.pages.length > 0;
  const [compare, setCompare] = useState(true);
  const showOriginal = compare && hasOriginal;
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

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
          {hasOriginal && (
            <button
              type="button"
              className="btn btn-outline"
              aria-pressed={compare}
              onClick={() => setCompare((c) => !c)}
            >
              <Columns2 size={16} aria-hidden="true" />
              Mit Original vergleichen
            </button>
          )}
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
      {needsAttention(res) && (
        <Banner tone="warning" title="Bitte vor dem Drucken prüfen">
          {res.result.confidence_note ??
            "Die Sicherheitsprüfung hat wichtige Hinweise gefunden. Vergleichen Sie das Blatt mit dem Brief."}
        </Banner>
      )}

      <div className={showOriginal ? "workspace-grid is-compare" : "workspace-grid"}>
        <HandoutSettings
          settings={settings}
          onChange={setSettings}
          language={res.result.target_language}
          languages={languages}
          busy={a.status === "analyzing"}
          onChangeLanguage={(l) => void a.reanalyze(l)}
        />
        {showOriginal && (
          <section className="compare-original" aria-label="Originaldokument">
            <p className="hint">
              Original mit Markierungen. Die Nummern gehören zu den Zeilen im Patientenblatt: Klicken Sie auf eine
              Markierung oder eine Zeile, um die passende Stelle zu sehen.
            </p>
            <DocumentViewer
              pages={a.pages}
              result={res.result}
              items={items}
              verifications={a.verifications}
              mode="highlights"
              activeItemId={activeItemId}
              activeBlockId={activeBlockId}
              onSelectItem={setActiveItemId}
              onSelectBlock={setActiveBlockId}
            />
          </section>
        )}
        <Handout
          model={model}
          onLayout={setLayout}
          onSelectItem={showOriginal ? setActiveItemId : undefined}
          activeItemId={showOriginal ? activeItemId : null}
        />
      </div>
    </main>
  );
}
