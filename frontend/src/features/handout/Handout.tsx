// Printable A4 handout: measures blocks off-screen, paginates them, renders the sheets twice
// (on-screen preview and a print-only portal on <body>).
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { buildBlocks, continuationHeader, type HandoutBlock } from "./blocks";
import type { HandoutModel } from "./model";
import { SHEET_CONTENT_HEIGHT_PX, paginate, type FlowBlock, type Pagination } from "./paginate";
import "./handout.css";

export interface HandoutLayout {
  pages: number;
  overflowing: number[];
}

interface Props {
  model: HandoutModel;
  onSelectItem?: (id: string) => void;
  onLayout?: (l: HandoutLayout) => void;
}

function Sheets({ blocks, pagination, continuation }: { blocks: HandoutBlock[]; pagination: Pagination; continuation: ReactNode }) {
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
          <span className="sheet-number">
            {i + 1} / {total}
          </span>
        </article>
      ))}
    </>
  );
}

export function Handout({ model, onSelectItem, onLayout }: Props) {
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

  const common = { "data-size": model.settings.size, dir: model.dir, lang: model.htmlLang };
  const sheets = <Sheets blocks={blocks} pagination={pagination} continuation={continuation} />;

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
      <div className="handout handout-preview" {...common}>
        {sheets}
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
