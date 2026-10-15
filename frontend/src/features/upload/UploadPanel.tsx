import { useRef, useState } from "react";
import type { SampleInfo } from "../../api/types";
import type { PreparedPage } from "./preparePages";

interface Props {
  pages: PreparedPage[];
  maxPages: number;
  busy: boolean;
  onAddFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onAnalyze: () => void;
  onTrySample: (id: string) => void;
  samples: SampleInfo[];
  title: string;
  hint: string; // "{max_pages}" is replaced by maxPages
  processing: { provider: string; region: string; eu: boolean };
  privacy?: { requires_consent: boolean; consent_text: string | null; recommend_eu_processing: boolean };
  consent: boolean;
  onConsent: (v: boolean) => void;
}

export function UploadPanel({
  pages,
  maxPages,
  busy,
  onAddFiles,
  onRemove,
  onMove,
  onAnalyze,
  onTrySample,
  samples,
  title,
  hint,
  processing,
  privacy,
  consent,
  onConsent,
}: Props) {
  const needsConsent = privacy?.requires_consent ?? false;
  const consentText = (privacy?.consent_text ?? "")
    .replace("{provider}", processing.provider)
    .replace("{region}", processing.region);
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
        <p className="dz-title">{title}</p>
        <p className="dz-sub">
          {hint.replace("{max_pages}", String(maxPages))}
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
          {needsConsent && (
            <div className="consent">
              <label>
                <input type="checkbox" checked={consent} onChange={(e) => onConsent(e.target.checked)} />
                <span>{consentText}</span>
              </label>
              {privacy?.recommend_eu_processing && !processing.eu && (
                <p className="consent-warning" role="note">
                  ⚠ The current AI provider processes data outside the EU ({processing.region}). For health data an
                  EU provider is recommended.
                </p>
              )}
            </div>
          )}
          <button
            type="button"
            className="btn primary wide"
            onClick={onAnalyze}
            disabled={busy || (needsConsent && !consent)}
          >
            {busy ? "Working…" : `Translate & explain ${pages.length} page${pages.length === 1 ? "" : "s"}`}
          </button>
        </>
      ) : (
        <div className="sample-cta">
          <p>No document at hand? Try a sample:</p>
          <div className="sample-buttons">
            {samples.map((s) => (
              <button key={s.id} type="button" className="btn link" onClick={() => onTrySample(s.id)} disabled={busy}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="privacy">
        Processed by: {processing.provider} · {processing.region}. Only to analyse your document — nothing is
        stored by this app.
      </p>
    </section>
  );
}
