// Printable A4 handout: measures blocks off-screen, paginates them, renders the sheets twice
// (on-screen preview and a print-only portal on <body>).
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { buildBlocks, continuationHeader, type HandoutBlock } from "./blocks";
import type { HandoutModel } from "./model";
import { SHEET_CONTENT_HEIGHT_PX, SHEET_MM, mmToPx, paginate, type FlowBlock, type Pagination } from "./paginate";
import "./handout.css";

export interface HandoutLayout {
  pages: number;
  overflowing: number[];
}

interface Props {
  model: HandoutModel;
  onSelectItem?: (id: string) => void;
  onLayout?: (l: HandoutLayout) => void;
  /** Row linked to the highlight selected on the original; outlined and scrolled into view. */
  activeItemId?: string | null;
}

const SHEET_WIDTH_PX = mmToPx(SHEET_MM.width);
const FRAME_PAD_PX = 32;

/** Scales the A4 sheets down so they fit a narrow column (e.g. next to the original). Preview only. */
function useFitZoom() {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setZoom(Math.min(1, entry.contentRect.width / (SHEET_WIDTH_PX + FRAME_PAD_PX)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, zoom] as const;
}

interface SheetsProps {
  blocks: HandoutBlock[];
  pagination: Pagination;
  continuation: ReactNode;
  footer: string;
}

function Sheets({ blocks, pagination, continuation, footer }: SheetsProps) {
  const total = pagination.sheets.length;
  return (
    <>
      {pagination.sheets.map((indices, i) => (
        <article
          key={i}
          className="sheet"
          data-overflow={pagination.overflowing.includes(i) || undefined}
          aria-label={`Seite ${i + 1}`}
        >
          <div className="sheet-inner">
            {pagination.continued[i] && continuation}
            {indices.map((b) => (
              <div key={blocks[b].key} data-block>{blocks[b].node}</div>
            ))}
          </div>
          <footer className="sheet-foot">
            <span>{footer}</span>
            <span>
              {i + 1} / {total}
            </span>
          </footer>
        </article>
      ))}
    </>
  );
}

export function Handout({ model, onSelectItem, onLayout, activeItemId = null }: Props) {
  const blocks = useMemo(() => buildBlocks(model, onSelectItem), [model, onSelectItem]);
  const continuation = useMemo(() => continuationHeader(model, "meds"), [model]);
  const measureRef = useRef<HTMLDivElement>(null);
  const [pagination, setPagination] = useState<Pagination>({ sheets: [], continued: [], overflowing: [] });
  const onLayoutRef = useRef(onLayout);
  onLayoutRef.current = onLayout;

  useLayoutEffect(() => {
    let cancelled = false;
    const measure = () => {
      const root = measureRef.current;
      if (!root || cancelled) return;
      const heights = [...root.querySelectorAll<HTMLElement>("[data-block]")].map(
        (el) => el.getBoundingClientRect().height,
      );
      const contEl = root.querySelector<HTMLElement>('[data-continuation="meds"]');
      const contHeight = contEl ? contEl.getBoundingClientRect().height : 0;
      const flow: FlowBlock[] = blocks.map((b, i) => ({
        height: heights[i] ?? 0,
        breakBefore: b.breakBefore,
        keepWithNext: b.keepWithNext,
        group: b.group,
        continuationHeight: b.group ? contHeight : undefined,
      }));
      const next = paginate(flow, SHEET_CONTENT_HEIGHT_PX);
      setPagination((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    measure();
    void document.fonts?.ready.then(measure);
    return () => {
      cancelled = true;
    };
  }, [blocks]);

  useEffect(() => {
    if (pagination.sheets.length) {
      onLayoutRef.current?.({ pages: pagination.sheets.length, overflowing: pagination.overflowing });
    }
  }, [pagination]);

  const [frameRef, zoom] = useFitZoom();

  useEffect(() => {
    const root = frameRef.current;
    if (!root) return;
    root.querySelectorAll(".is-linked").forEach((el) => el.classList.remove("is-linked"));
    if (!activeItemId) return;
    const hits = root.querySelectorAll<HTMLElement>(`[data-item="${CSS.escape(activeItemId)}"]`);
    hits.forEach((el) => el.classList.add("is-linked"));
    hits[0]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeItemId, pagination, frameRef]);

  const onPreviewClick = (e: MouseEvent) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>("[data-item]")?.dataset.item;
    if (id) onSelectItem?.(id);
  };

  const common = { "data-size": model.settings.size, dir: model.dir, lang: model.htmlLang };
  const sheets = <Sheets blocks={blocks} pagination={pagination} continuation={continuation} footer={model.t.madeWith} />;

  return (
    <>
      <div className="handout handout-measure" {...common} aria-hidden="true" ref={measureRef}>
        {blocks.map((b) => (
          <div key={b.key} data-block>
            {b.node}
          </div>
        ))}
        <div data-continuation="meds">{continuation}</div>
      </div>
      <div className="handout-frame" ref={frameRef}>
        <div
          className="handout handout-preview"
          data-linkable={onSelectItem ? true : undefined}
          style={{ zoom, "--zoom": zoom } as CSSProperties}
          onClick={onPreviewClick}
          {...common}
        >
          {sheets}
        </div>
      </div>
      {createPortal(
        <div className="handout print-root" {...common}>
          {sheets}
        </div>,
        document.body,
      )}
    </>
  );
}
