import { useRef, useState } from "react";
import type { PreparedPage } from "./preparePages";

interface Props {
  pages: PreparedPage[];
  maxPages: number;
  busy: boolean;
  onAddFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onAnalyze: () => void;
  onTrySample: () => void;
}

export function UploadPanel({ pages, maxPages, busy, onAddFiles, onRemove, onMove, onAnalyze, onTrySample }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const take = (list: FileList | null) => {
    if (list?.length) onAddFiles(Array.from(list));
  };

  return (
    <section className="upload card">
      <div
        className={`dropzone ${dragging ? "is-dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          take(e.dataTransfer.files);
        }}
      >
        <p className="dz-title">Photograph or upload your letter</p>
        <p className="dz-sub">
          Photos (JPEG, PNG) or a PDF · up to {maxPages} pages · lay the page flat in good light
        </p>
        <div className="dz-actions">
          <button type="button" className="btn primary" onClick={() => cameraInput.current?.click()} disabled={busy}>
            📷 Take photo
          </button>
          <button type="button" className="btn secondary" onClick={() => fileInput.current?.click()} disabled={busy}>
            Choose files
          </button>
        </div>
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            take(e.target.files);
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
            take(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {pages.length > 0 ? (
        <>
          <ol className="thumbs" aria-label="Pages in order">
            {pages.map((p, i) => (
              <li key={p.id} className="thumb">
                <img src={p.url} alt={`Page ${i + 1}`} />
                <span className="thumb-n">{i + 1}</span>
                <div className="thumb-actions">
                  <button type="button" aria-label="Move earlier" disabled={i === 0 || busy} onClick={() => onMove(p.id, -1)}>
                    ←
                  </button>
                  <button type="button" aria-label="Remove page" disabled={busy} onClick={() => onRemove(p.id)}>
                    ✕
                  </button>
                  <button
                    type="button"
                    aria-label="Move later"
                    disabled={i === pages.length - 1 || busy}
                    onClick={() => onMove(p.id, 1)}
                  >
                    →
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <button type="button" className="btn primary wide" onClick={onAnalyze} disabled={busy}>
            {busy ? "Working…" : `Translate & explain ${pages.length} page${pages.length === 1 ? "" : "s"}`}
          </button>
        </>
      ) : (
        <p className="sample-cta">
          No letter at hand?{" "}
          <button type="button" className="btn link" onClick={onTrySample} disabled={busy}>
            Try a sample fine notice
          </button>
        </p>
      )}
      <p className="privacy">
        Your images are sent to the AI service only to analyse them and are not stored by this app.
      </p>
    </section>
  );
}
