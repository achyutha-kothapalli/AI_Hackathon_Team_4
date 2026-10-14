import { useCallback, useRef, useState } from "react";
import { useAnalysis } from "./features/analysis/useAnalysis";
import { CalendarSheet } from "./features/calendar/CalendarSheet";
import { HomeScreen } from "./features/home/HomeScreen";
import { OnboardingScreen } from "./features/onboarding/OnboardingScreen";
import { ProcessingScreen } from "./features/processing/ProcessingScreen";
import { ResultScreen } from "./features/result/ResultScreen";
import { SamplesSheet } from "./features/samples/SamplesSheet";
import { CheckScreen } from "./features/upload/CheckScreen";
import { OriginalSheet } from "./features/viewer/OriginalSheet";
import { Icon } from "./ui/Icon";
import { LanguageList } from "./ui/LanguageList";
import { Sheet } from "./ui/Sheet";
import { Topbar } from "./ui/Topbar";
import { ToastProvider, useToast } from "./ui/toast";

type Screen = "home" | "check" | "processing" | "result";
type SheetState =
  | { type: "language" }
  | { type: "samples" }
  | { type: "original"; itemId: string | null }
  | { type: "calendar" }
  | null;

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}

function Shell() {
  const a = useAnalysis();
  const toast = useToast();
  const [screen, setScreenState] = useState<Screen>("home");
  const [sheet, setSheet] = useState<SheetState>(null);
  const [calendarAdded, setCalendarAdded] = useState(false);
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const closeSheet = useCallback(() => setSheet(null), []);

  const go = (s: Screen) => {
    setScreenState(s);
    setSheet(null);
    window.scrollTo(0, 0);
  };

  const run = async () => {
    go("processing");
    setCalendarAdded(false);
    const outcome = await a.analyze();
    if (outcome === "done") go("result");
    else if (outcome === "error") go("check");
    // "cancelled": the cancel handler already moved on.
  };

  /** New files from Home start a new letter; from Check they add pages. */
  const takeFiles = async (files: File[]) => {
    if (!files.length) return;
    if (screen !== "check") {
      a.reset();
      go("check");
    }
    await a.addFiles(files);
  };

  const pickSample = async (id: string) => {
    setSheet(null);
    if (await a.loadSample(id)) await run();
    else go("check");
  };

  if (!a.languageChosen) {
    return (
      <div className="shell">
        <Topbar language={a.targetLanguage} onLanguage={() => {}} languageDisabled />
        <OnboardingScreen
          languages={a.meta.languages}
          initial={a.targetLanguage}
          onConfirm={(name) => {
            a.setTargetLanguage(name);
            window.scrollTo(0, 0);
          }}
        />
      </div>
    );
  }

  const result = a.response?.result;

  return (
    <div className="shell">
      <Topbar
        language={a.targetLanguage}
        onLanguage={() => setSheet({ type: "language" })}
        languageDisabled={screen === "processing"}
        onBack={screen === "check" || screen === "result" ? () => go("home") : undefined}
        title={screen === "check" ? "Check your photo" : (result?.sender ?? result?.document_type)}
      />

      {a.error && screen === "home" && (
        <div className="screen notice-row">
          <div className="note danger" role="alert">
            <Icon name="alert" />
            <span>{a.error}</span>
          </div>
        </div>
      )}

      {screen === "home" && (
        <HomeScreen
          analyzer={a.meta.analyzer}
          lastResponse={a.response}
          onTakePhoto={() => cameraInput.current?.click()}
          onUpload={() => fileInput.current?.click()}
          onDropFiles={takeFiles}
          onSamples={() => setSheet({ type: "samples" })}
          onContinue={() => go("result")}
        />
      )}

      {screen === "check" && (
        <CheckScreen
          pages={a.pages}
          maxPages={a.meta.max_pages}
          preparing={a.status === "preparing"}
          error={a.error}
          onAddPage={() => fileInput.current?.click()}
          onDropFiles={takeFiles}
          onRemove={a.removePage}
          onMove={a.movePage}
          onExplain={run}
          onStartOver={() => {
            a.reset();
            go("home");
          }}
        />
      )}

      {screen === "processing" && (
        <ProcessingScreen
          previewUrl={a.pages[0]?.url ?? null}
          onCancel={() => {
            a.cancel();
            go("check");
          }}
        />
      )}

      {screen === "result" && a.response && (
        <ResultScreen
          key={a.response.result.summary}
          response={a.response}
          resultLanguage={a.resultLanguage ?? a.targetLanguage}
          targetLanguage={a.targetLanguage}
          coverage={a.coverage}
          ocrState={a.ocrState}
          calendarAdded={calendarAdded}
          onShowInLetter={(itemId) => setSheet({ type: "original", itemId })}
          onOpenOriginal={() => setSheet({ type: "original", itemId: null })}
          onOpenCalendar={() => setSheet({ type: "calendar" })}
          onExplainAgain={run}
          onScanAnother={() => {
            a.reset();
            go("home");
          }}
        />
      )}

      {sheet?.type === "language" && (
        <Sheet title="Translation language" onClose={closeSheet}>
          <p className="muted small sheet-intro">Letters are explained in this language.</p>
          <LanguageList
            languages={a.meta.languages}
            selected={a.targetLanguage}
            onPick={(name) => {
              a.setTargetLanguage(name);
              setSheet(null);
            }}
          />
        </Sheet>
      )}
      {sheet?.type === "samples" && <SamplesSheet onPick={pickSample} onClose={closeSheet} />}
      {sheet?.type === "original" && result && (
        <OriginalSheet
          pages={a.pages}
          result={result}
          resultLanguage={a.resultLanguage ?? a.targetLanguage}
          verifications={a.verifications}
          initialItemId={sheet.itemId}
          onClose={closeSheet}
        />
      )}
      {sheet?.type === "calendar" && result && (
        <CalendarSheet
          result={result}
          onClose={closeSheet}
          onAdded={() => {
            setCalendarAdded(true);
            setSheet(null);
            toast("Added to calendar", "calendarCheck");
          }}
        />
      )}

      {/* Native camera on phones, file picker everywhere else. */}
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          takeFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <input
        ref={fileInput}
        type="file"
        accept="image/*,application/pdf"
        multiple
        hidden
        onChange={(e) => {
          takeFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </div>
  );
}
