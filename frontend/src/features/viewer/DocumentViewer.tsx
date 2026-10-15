import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { AnalysisResult, BBox } from "../../api/types";
import type { Highlightable } from "../../lib/highlights";
import { KIND_META } from "../../lib/kinds";
import type { Verification } from "../ocr/verifyHighlights";
import type { PreparedPage } from "../upload/preparePages";
import { FitText } from "./FitText";
import { placeMarkers } from "./markers";

export type ViewMode = "highlights" | "translation" | "original";

interface Props {
  pages: PreparedPage[];
  result: AnalysisResult;
  items: Highlightable[]; // key facts + medicines
  verifications: Record<string, Verification> | null;
  mode: ViewMode;
  activeItemId: string | null;
  activeBlockId: string | null;
  onSelectItem: (id: string) => void;
  onSelectBlock: (id: string | null) => void;
}

const MARKER_PX = 22; // matches .highlight .marker (20px + room for two digits)
const MARKER_GAP_PX = 2;

const pct = (b: BBox) => ({
  left: `${b.x0 / 10}%`,
  top: `${b.y0 / 10}%`,
  width: `${(b.x1 - b.x0) / 10}%`,
  height: `${(b.y1 - b.y0) / 10}%`,
});

export function DocumentViewer({
  pages,
  result,
  items,
  verifications,
  mode,
  activeItemId,
  activeBlockId,
  onSelectItem,
  onSelectBlock,
}: Props) {
  const highlightRefs = useRef(new Map<string, HTMLElement>());
  const rootRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLElement | null)[]>([]);
  const [width, setWidth] = useState(0);
  const [visiblePage, setVisiblePage] = useState(0);

  // Which page fills most of the scroll box; drives the page tabs.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || pages.length < 2) return;
    const ratios = new Map<Element, number>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => ratios.set(e.target, e.intersectionRatio));
        let best = 0;
        pageRefs.current.forEach((el, i) => {
          if (el && (ratios.get(el) ?? 0) > (ratios.get(pageRefs.current[best]!) ?? 0)) best = i;
        });
        setVisiblePage(best);
      },
      { root, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    pageRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [pages.length]);

  const goToPage = (i: number) => pageRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" });

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Sideways step per marker, so lines that sit close together do not stack their numbers.
  const steps = useMemo(() => {
    const all = new Map<string, number>();
    if (!width) return all;
    pages.forEach((page, pageIndex) => {
      const height = (width * page.height) / page.width;
      const spots = items
        .filter((k) => k.page === pageIndex)
        .map((k) => {
          const b = verifications?.[k.id]?.rects[0] ?? k.bbox;
          return { id: k.id, x: (b.x0 / 1000) * width, y: (b.y0 / 1000) * height };
        });
      placeMarkers(spots, MARKER_PX, MARKER_GAP_PX).forEach((step, id) => all.set(id, step));
    });
    return all;
  }, [pages, items, verifications, width]);

  useEffect(() => {
    if (!activeItemId) return;
    highlightRefs.current
      .get(activeItemId)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeItemId]);

  return (
    <div className="viewer-wrap">
      {pages.length > 1 && (
        <nav className="viewer-pages" aria-label="Seiten des Originals">
          {pages.map((page, i) => {
            const count = items.filter((k) => k.page === i).length;
            return (
              <button
                key={page.id}
                type="button"
                className="viewer-page-tab"
                aria-current={visiblePage === i ? "page" : undefined}
                aria-label={`Seite ${i + 1} von ${pages.length}, ${count} Markierungen`}
                onClick={() => goToPage(i)}
              >
                Seite {i + 1}
                {count > 0 && <span className="viewer-page-count">{count}</span>}
              </button>
            );
          })}
        </nav>
      )}
      <div className="viewer" ref={rootRef}>
        {pages.map((page, pageIndex) => {
          const blocks = result.blocks.filter((b) => b.page === pageIndex);
          const pageItems = items.filter((k) => k.page === pageIndex);
          return (
            <figure
              key={page.id}
              ref={(el) => {
                pageRefs.current[pageIndex] = el;
              }}
              className={`page mode-${mode}`}
              style={{ aspectRatio: `${page.width} / ${page.height}` }}
            >
              <img src={page.url} alt={`Seite ${pageIndex + 1} des hochgeladenen Dokuments`} />

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
                pageItems.map((item) => {
                  const v = verifications?.[item.id];
                  const rects = v?.rects ?? [item.bbox];
                  const tone = KIND_META[item.kind].tone;
                  const number = items.indexOf(item) + 1;
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
                      {i === 0 && (
                        <span className="marker" style={{ "--step": steps.get(item.id) ?? 0 } as CSSProperties}>
                          {number}
                        </span>
                      )}
                    </button>
                  ));
                })}

              {pages.length > 1 && (
                <figcaption>
                  Seite {pageIndex + 1} von {pages.length}
                </figcaption>
              )}
            </figure>
          );
        })}
      </div>
    </div>
  );
}
