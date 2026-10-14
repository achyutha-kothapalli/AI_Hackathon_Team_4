import { Icon } from "../../ui/Icon";
import type { PreparedPage } from "./preparePages";
import { useFileDrop } from "./useFileDrop";

interface Props {
  pages: PreparedPage[];
  maxPages: number;
  preparing: boolean;
  error: string | null;
  onAddPage: () => void;
  onDropFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onExplain: () => void;
  onStartOver: () => void;
}

export function CheckScreen({
  pages,
  maxPages,
  preparing,
  error,
  onAddPage,
  onDropFiles,
  onRemove,
  onMove,
  onExplain,
  onStartOver,
}: Props) {
  const drop = useFileDrop(onDropFiles);
  return (
    <div className={`screen check ${drop.dragging ? "is-dragging" : ""}`} {...drop.handlers}>
      <p className="muted">
        Make sure the text is sharp and readable. Official letters often have more than one page — add them in order.
      </p>
      {error && (
        <div className="note danger" role="alert">
          <Icon name="alert" />
          <span>{error}</span>
        </div>
      )}
      <div className="pages">
        {pages.map((p, i) => (
          <figure key={p.id} className="page-thumb">
            <img src={p.url} alt={`Page ${i + 1}`} />
            <figcaption>
              <span>Page {i + 1}</span>
              <span className="page-tools">
                {pages.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="icon-btn sm"
                      onClick={() => onMove(p.id, -1)}
                      disabled={i === 0}
                      aria-label="Move earlier"
                    >
                      <Icon name="back" className="flip-rtl" />
                    </button>
                    <button
                      type="button"
                      className="icon-btn sm"
                      onClick={() => onMove(p.id, 1)}
                      disabled={i === pages.length - 1}
                      aria-label="Move later"
                    >
                      <Icon name="next" className="flip-rtl" />
                    </button>
                  </>
                )}
                <button type="button" className="icon-btn sm" onClick={() => onRemove(p.id)} aria-label="Remove page">
                  <Icon name="trash" />
                </button>
              </span>
            </figcaption>
            <span className="page-name">{p.sourceName}</span>
          </figure>
        ))}
        {preparing && (
          <div className="page-loading">
            <span className="spinner" />
            Reading file…
          </div>
        )}
        {!preparing && pages.length < maxPages && (
          <button type="button" className="page-add" onClick={onAddPage}>
            <Icon name="plus" />
            <span>Add page</span>
          </button>
        )}
      </div>
      <div className="bottom-cta">
        <button
          type="button"
          className="btn btn-primary btn-lg btn-block"
          onClick={onExplain}
          disabled={!pages.length || preparing}
        >
          Explain this letter
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={onStartOver}>
          Start over
        </button>
      </div>
    </div>
  );
}
