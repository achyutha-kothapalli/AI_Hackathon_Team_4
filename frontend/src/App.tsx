import { Banner } from "./components/Banner";
import { StaffTopBar } from "./components/StaffTopBar";
import { screenFor } from "./features/analysis/screen";
import { useAnalysis } from "./features/analysis/useAnalysis";
import { ProcessingScreen } from "./features/processing/ProcessingScreen";
import { ReadErrorScreen } from "./features/processing/ReadErrorScreen";
import { StartScreen } from "./features/start/StartScreen";
import { Workspace } from "./features/workspace/Workspace";

export default function App() {
  const a = useAnalysis();
  const screen = screenFor(a.status, a.response);

  return (
    <div className="app">
      <StaffTopBar onNewLetter={screen === "start" ? undefined : a.reset} />
      {a.meta.analyzer === "mock" && (
        <div className="container demo-strip">
          <Banner tone="info" title="Demo-Modus">
            Der Server hat keinen KI-Schlüssel. Es werden vorbereitete Beispielantworten angezeigt; Ihre Datei wird
            nicht gelesen.
          </Banner>
        </div>
      )}
      {screen === "start" && <StartScreen a={a} />}
      {screen === "processing" && (
        <ProcessingScreen
          onCancel={a.cancel}
          sampleName={a.pages[0]?.sourceName}
          redacting={a.redact}
          phase={a.phase}
        />
      )}
      {screen === "read-error" && (
        <ReadErrorScreen
          onRetry={a.backToStart}
          onUseSample={() => {
            a.backToStart();
            void a.trySample(a.samples[0].id);
          }}
        />
      )}
      {screen === "workspace" && <Workspace a={a} />}
    </div>
  );
}
