import { useMemo, useState } from "react";
import { Progress } from "./components/Progress";
import { APP_NAME } from "./config/app";
import { DisplaySettings } from "./features/accessibility/DisplaySettings";
import { useAnalysis } from "./features/analysis/useAnalysis";
import { InsightsPanel } from "./features/insights/InsightsPanel";
import { UploadPanel } from "./features/upload/UploadPanel";
import { DocumentViewer, type ViewMode } from "./features/viewer/DocumentViewer";
import { highlightItems } from "./lib/highlights";

export default function App() {
  const a = useAnalysis();
  const [mode, setMode] = useState<ViewMode>("highlights");
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const items = useMemo(() => (a.response ? highlightItems(a.response.result) : []), [a.response]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src="/favicon.svg" alt="" width={28} height={28} />
          <span>{APP_NAME}</span>
        </div>
        <div className="topbar-controls">
          {a.meta.profiles.length > 1 && (
            <label className="lang">
              <span>Document</span>
              <select
                value={a.activeProfile}
                onChange={(e) => a.switchProfile(e.target.value)}
                disabled={a.status === "analyzing"}
              >
                {a.meta.profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="lang">
            <span>Explain in</span>
            <select
              value={a.targetLanguage}
              onChange={(e) => a.setTargetLanguage(e.target.value)}
              disabled={a.status === "analyzing"}
            >
              {a.languages.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <DisplaySettings />
        </div>
      </header>

      {a.meta.analyzer === "mock" && (
        <p className="demo-banner">
          Demo mode: the server has no AI key, so uploads return a prepared sample analysis instead of reading your document.
        </p>
      )}

      {a.error && (
        <p className="error" role="alert">
          {a.error}
        </p>
      )}

      {!a.response ? (
        <main className="start">
          <div className="intro">
            <h1>{a.ui.headline}</h1>
            <p>{a.ui.intro}</p>
          </div>
          <UploadPanel
            pages={a.pages}
            maxPages={a.meta.max_pages}
            busy={a.status === "preparing" || a.status === "analyzing"}
            onAddFiles={a.addFiles}
            onRemove={a.removePage}
            onMove={a.movePage}
            onAnalyze={a.analyze}
            onTrySample={a.trySample}
            samples={a.samples}
            title={a.ui.upload_title}
            hint={a.ui.upload_hint}
            processing={a.meta.processing}
            privacy={a.domain?.privacy}
            consent={a.consent}
            onConsent={a.setConsent}
          />
          {a.status === "analyzing" && <Progress steps={a.ui.progress} />}
        </main>
      ) : (
        <main className="results">
          <p className="sr-only" role="status" aria-live="polite">
            Analysis finished: {a.response.result.medications.length} medicines and {a.response.result.key_items.length}{" "}
            important details found. {a.response.checks.summary.critical + a.response.checks.summary.warnings} points to check.
          </p>
          <div className="toolbar">
            <div className="segmented" role="tablist" aria-label="Document view">
              {(
                [
                  ["highlights", "Highlights"],
                  ["translation", "Translated"],
                  ["original", "Original"],
                ] as const
              ).map(([m, label]) => (
                <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}>
                  {label}
                </button>
              ))}
            </div>
            <button type="button" className="btn secondary" onClick={a.reset}>
              New document
            </button>
          </div>
          <div className="columns">
            <DocumentViewer
              pages={a.pages}
              result={a.response.result}
              items={items}
              verifications={a.verifications}
              mode={mode}
              activeItemId={activeItemId}
              activeBlockId={activeBlockId}
              onSelectItem={setActiveItemId}
              onSelectBlock={setActiveBlockId}
            />
            <InsightsPanel
              result={a.response.result}
              checks={a.response.checks}
              targetLanguage={a.targetLanguage}
              coverage={a.coverage}
              verifications={a.verifications}
              ocrState={a.ocrState}
              activeItemId={activeItemId}
              activeBlockId={activeBlockId}
              onSelectItem={setActiveItemId}
              onSelectBlock={setActiveBlockId}
            />
          </div>
          <p className="disclaimer">{a.ui.disclaimer}</p>
        </main>
      )}
    </div>
  );
}
