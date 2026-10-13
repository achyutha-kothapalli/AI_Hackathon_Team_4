import { useEffect, useRef } from "react";
import type { AnalysisResult, BBox } from "../../api/types";
import { KIND_META } from "../../lib/kinds";
import type { Verification } from "../ocr/verifyHighlights";
import type { PreparedPage } from "../upload/preparePages";
import { FitText } from "./FitText";

export type ViewMode = "highlights" | "translation" | "original";

interface Props {
  pages: PreparedPage[];
  result: AnalysisResult;
  verifications: Record<string, Verification> | null;
  mode: ViewMode;
  activeItemId: string | null;
  activeBlockId: string | null;
  onSelectItem: (id: string) => void;
  onSelectBlock: (id: string | null) => void;
}

const pct = (b: BBox) => ({
  left: `${b.x0 / 10}%`,
  top: `${b.y0 / 10}%`,
  width: `${(b.x1 - b.x0) / 10}%`,
  height: `${(b.y1 - b.y0) / 10}%`,
});

export function DocumentViewer({
  pages,
  result,
  verifications,
  mode,
  activeItemId,
  activeBlockId,
  onSelectItem,
  onSelectBlock,
}: Props) {
  const highlightRefs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    if (!activeItemId) return;
    highlightRefs.current
      .get(activeItemId)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeItemId]);

  return (
    <div className="viewer">
      {pages.map((page, pageIndex) => {
        const blocks = result.blocks.filter((b) => b.page === pageIndex);
        const items = result.key_items.filter((k) => k.page === pageIndex);
        return (
          <figure
            key={page.id}
            className={`page mode-${mode}`}
            style={{ aspectRatio: `${page.width} / ${page.height}` }}
          >
            <img src={page.url} alt={`Page ${pageIndex + 1} of the uploaded document`} />

            {mode !== "original" &&
              blocks.map((block) => (
                <div
                  key={block.id}
                  className={`block ${activeBlockId === block.id ? "is-active" : ""}`}
                  style={pct(block.bbox)}
                  onMouseEnter={() => onSelectBlock(block.id)}
                  onMouseLeave={() => onSelectBlock(null)}
                  title={mode === "translation" ? block.original : block.translation}
                >
                  {mode === "translation" && <FitText text={block.translation} />}
                </div>
              ))}

            {mode !== "original" &&
              items.map((item) => {
                const v = verifications?.[item.id];
                const rects = v?.rects ?? [item.bbox];
                const tone = KIND_META[item.kind].tone;
                const number = result.key_items.indexOf(item) + 1;
                return rects.map((r, i) => (
                  <button
                    key={`${item.id}-${i}`}
                    ref={(el) => {
                      if (el && i === 0) highlightRefs.current.set(item.id, el);
                    }}
                    type="button"
                    className={`highlight tone-${tone} ${activeItemId === item.id ? "is-active" : ""} ${
                      v && !v.verified ? "is-approx" : ""
                    }`}
                    style={pct(r)}
                    onClick={() => onSelectItem(item.id)}
                    aria-label={`${item.label}: ${item.value}`}
                  >
                    {i === 0 && <span className="marker">{number}</span>}
                  </button>
                ));
              })}

            {pages.length > 1 && (
              <figcaption>
                Page {pageIndex + 1} of {pages.length}
              </figcaption>
            )}
          </figure>
        );
      })}
    </div>
  );
}
