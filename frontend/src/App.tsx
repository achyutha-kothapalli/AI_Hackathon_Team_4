import { useEffect, useState } from "react";
import { useAnalysis } from "./features/analysis/useAnalysis";
import { InsightsPanel } from "./features/insights/InsightsPanel";
import { UploadPanel } from "./features/upload/UploadPanel";
import { DocumentViewer, type ViewMode } from "./features/viewer/DocumentViewer";

const PROGRESS = [
  "Reading your document…",
  "Translating every paragraph…",
  "Looking for deadlines and amounts…",
  "Writing a plain-language summary…",
];

export default function App() {
  const a = useAnalysis();
  const [mode, setMode] = useState<ViewMode>("highlights");
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src="/favicon.svg" alt="" width={28} height={28} />
          <span>BriefVerstehen</span>
        </div>
        <label className="lang">
          <span>Translate to</span>
          <select
            value={a.targetLanguage}
            onChange={(e) => a.setTargetLanguage(e.target.value)}
            disabled={a.status === "analyzing"}
          >
            {a.meta.languages.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
      </header>

      {a.meta.analyzer === "mock" && (
        <p className="demo-banner">
          Demo mode: the server has no AI key, so uploads return a prepared sample analysis instead of reading your letter.
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
            <h1>Understand official letters in your language</h1>
            <p>
              Take a photo of a German letter. You get a translation, the deadlines and amounts that matter, and
              exactly where each one is written on the page.
            </p>
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
          />
          {a.status === "analyzing" && <Progress />}
        </main>
      ) : (
        <main className="results">
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
              coverage={a.coverage}
              verifications={a.verifications}
              ocrState={a.ocrState}
              activeItemId={activeItemId}
              activeBlockId={activeBlockId}
              onSelectItem={setActiveItemId}
              onSelectBlock={setActiveBlockId}
            />
          </div>
          <p className="disclaimer">
            AI translations can contain mistakes. For legal decisions, check with the sender or an advice centre
            (e.g. Verbraucherzentrale, Migrationsberatung).
          </p>
        </main>
      )}
    </div>
  );
}

function Progress() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, PROGRESS.length - 1)), 4000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="progress" role="status">
      <span className="spinner" aria-hidden />
      {PROGRESS[i]}
    </div>
  );
}
