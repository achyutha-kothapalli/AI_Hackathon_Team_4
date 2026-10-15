import { ArrowLeft, ArrowRight, Camera, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import type { PreparedPage } from "../upload/preparePages";

interface Props {
  pages: PreparedPage[];
  maxPages: number;
  busy: boolean;
  onAddFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, delta: -1 | 1) => void;
}

/** Drop area with file and camera pickers, plus the ordered page thumbnails. */
export function DropZone({ pages, maxPages, busy, onAddFiles, onRemove, onMove }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const take = (list: FileList | null) => {
    if (list?.length) onAddFiles(Array.from(list));
  };

  return (
    <div className="drop">
      <div
        className={`drop-zone${dragging ? " is-dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy) take(e.dataTransfer.files);
        }}
      >
        <p className="drop-title">Brief hier ablegen</p>
        <p className="hint">
          Foto (JPG, PNG) oder PDF · bis zu <span className="mono">{maxPages}</span> Seiten · Seite flach und gut
          beleuchtet
        </p>
        <div className="drop-actions">
          <button type="button" className="btn btn-outline" onClick={() => fileInput.current?.click()} disabled={busy}>
            <Upload size={18} aria-hidden="true" />
            Datei auswählen
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => cameraInput.current?.click()}
            disabled={busy}
          >
            <Camera size={18} aria-hidden="true" />
            Foto aufnehmen
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

      {pages.length > 0 && (
        <ol className="page-list" aria-label="Seiten in Reihenfolge">
          {pages.map((p, i) => (
            <li key={p.id} className="page-item">
              <img src={p.url} alt={`Seite ${i + 1}`} />
              <span className="page-n mono">{i + 1}</span>
              <div className="page-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  aria-label="Nach vorne"
                  disabled={i === 0 || busy}
                  onClick={() => onMove(p.id, -1)}
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  aria-label="Seite entfernen"
                  disabled={busy}
                  onClick={() => onRemove(p.id)}
                >
                  <X size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  aria-label="Nach hinten"
                  disabled={i === pages.length - 1 || busy}
                  onClick={() => onMove(p.id, 1)}
                >
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
