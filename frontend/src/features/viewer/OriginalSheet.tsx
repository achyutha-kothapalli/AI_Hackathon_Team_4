import { useState } from "react";
import type { AnalysisResult } from "../../api/types";
import { contentAttrs } from "../../lib/languages";
import { Sheet } from "../../ui/Sheet";
import type { Verification } from "../ocr/verifyHighlights";
import type { PreparedPage } from "../upload/preparePages";
import { DocumentViewer, type ViewMode } from "./DocumentViewer";

const TABS: [ViewMode, string][] = [
  ["highlights", "Highlights"],
  ["translation", "Translated"],
  ["original", "Original"],
];

interface Props {
  pages: PreparedPage[];
  result: AnalysisResult;
  resultLanguage: string;
  verifications: Record<string, Verification> | null;
  initialItemId: string | null;
  onClose: () => void;
}

export function OriginalSheet({ pages, result, resultLanguage, verifications, initialItemId, onClose }: Props) {
  const [mode, setMode] = useState<ViewMode>("highlights");
  const [activeItemId, setActiveItemId] = useState(initialItemId);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const active = result.key_items.find((k) => k.id === activeItemId);
  const v = active && verifications?.[active.id];

  return (
    <Sheet title="Original letter" full onClose={onClose}>
      <div className="sheet-sticky">
        <div className="segmented three" role="tablist" aria-label="Document view">
          {TABS.map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              className={mode === m ? "is-active" : ""}
              onClick={() => setMode(m)}
            >
              {label}
            </button>
          ))}
        </div>

        {mode !== "original" &&
          (active ? (
            <div className="viewer-caption" {...contentAttrs(resultLanguage)}>
              <strong>
                {active.label}: <span dir="ltr">{active.value}</span>
              </strong>
              <span>{active.explanation}</span>
              {v && !v.verified && (
                <span lang="en">The box shows the AI’s estimate; we couldn’t confirm the exact spot.</span>
              )}
            </div>
          ) : (
            <p className="viewer-hint">Tap a highlight to see what it means.</p>
          ))}
      </div>

      <DocumentViewer
        pages={pages}
        result={result}
        verifications={verifications}
        mode={mode}
        activeItemId={activeItemId}
        activeBlockId={activeBlockId}
        onSelectItem={setActiveItemId}
        onSelectBlock={setActiveBlockId}
      />

      {mode === "translation" && result.blocks.length > 0 && (
        <article className="paper" {...contentAttrs(resultLanguage)}>
          {result.blocks.map((b) => (
            <p
              key={b.id}
              className={`t-block ${activeBlockId === b.id ? "is-active" : ""}`}
              onMouseEnter={() => setActiveBlockId(b.id)}
              onMouseLeave={() => setActiveBlockId(null)}
            >
              {b.translation}
            </p>
          ))}
        </article>
      )}
    </Sheet>
  );
}
