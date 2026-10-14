// Shows the backend's accuracy & safety harness report plus the browser's own
// OCR coverage check. Everything here is computed by code, not by the AI.

import type { Finding, HarnessReport, Severity } from "../../api/types";
import type { OcrState } from "../analysis/useAnalysis";
import type { Coverage } from "../ocr/verifyHighlights";

const SEVERITY: Record<Severity, { icon: string; label: string }> = {
  critical: { icon: "⛔", label: "Check before acting" },
  warning: { icon: "⚠", label: "Please check" },
  info: { icon: "ℹ", label: "Good to know" },
};

const CATEGORY_LABEL: Record<Finding["category"], string> = {
  grounding: "Not found in letter",
  completeness: "Possibly missing",
  legal: "Legal rule",
  scam: "Scam warning",
  injection: "Manipulation",
  quality: "Reading quality",
  escalation: "Get help",
};

interface Props {
  checks: HarnessReport;
  coverage: Coverage | null;
  ocrState: OcrState;
  onSelectItem: (id: string) => void;
}

export function ChecksPanel({ checks, coverage, ocrState, onSelectItem }: Props) {
  const { summary, findings, escalation } = checks;
  const grouped = (["critical", "warning", "info"] as const).map((s) => [s, findings.filter((f) => f.severity === s)] as const);
  const allGrounded = summary.grounded_items === summary.total_items;
  const coverageOk = coverage ? coverage.ratio >= 0.9 : null;

  return (
    <section className="card checks" aria-labelledby="checks-title">
      {checks.scam_suspected && (
        <div className="alarm" role="alert">
          <strong>⛔ This letter may be a scam or manipulated.</strong> Do not pay or reply before verifying it with the
          sender, using contact details you look up yourself.
        </div>
      )}

      <h2 id="checks-title">Safety checks</h2>
      <ul className="check-stats">
        <li className={allGrounded ? "ok" : "bad"}>
          <span className="stat">
            {summary.grounded_items}/{summary.total_items}
          </span>
          facts traced to the letter text
        </li>
        <li className={coverageOk === null ? "" : coverageOk ? "ok" : "bad"}>
          <span className="stat">
            {coverage ? `${Math.round(coverage.ratio * 100)}%` : ocrState === "running" ? "…" : "–"}
          </span>
          of the text on the photo is covered
        </li>
        <li className={summary.critical ? "bad" : summary.warnings ? "warn" : "ok"}>
          <span className="stat">{summary.critical + summary.warnings}</span>
          {summary.critical + summary.warnings === 1 ? "point to check" : "points to check"}
        </li>
      </ul>
      <p className="hint">
        Document type: <strong>{checks.document_class.label}</strong>
      </p>

      {coverage && !coverageOk && (
        <div className="finding sev-warning">
          <span className="sev">{SEVERITY.warning.icon}</span>
          <div>
            <p className="f-cat">Possibly missing</p>
            <p>
              Some text on the photo may not have been read
              {coverage.missing.length > 0 && <>, e.g. “{coverage.missing.slice(0, 4).join("”, “")}”</>}. Compare the
              translation with the letter.
            </p>
          </div>
        </div>
      )}

      {grouped.map(([sev, list]) =>
        list.length === 0 ? null : sev === "info" ? (
          <details key={sev} className="info-findings">
            <summary>
              {SEVERITY.info.icon} {list.length} note{list.length === 1 ? "" : "s"}
            </summary>
            {list.map((f, i) => (
              <FindingRow key={i} f={f} onSelectItem={onSelectItem} />
            ))}
          </details>
        ) : (
          list.map((f, i) => <FindingRow key={`${sev}-${i}`} f={f} onSelectItem={onSelectItem} />)
        ),
      )}

      {summary.critical + summary.warnings === 0 && coverageOk !== false && (
        <p className="all-clear">✓ No problems found. Every fact was traced back to the letter.</p>
      )}

      {escalation && (
        <div className="escalation">
          <h3>Get help</h3>
          <p>{escalation.reason}</p>
          <ul>
            {escalation.resources.map((r) => (
              <li key={r.id}>
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {r.label}
                  </a>
                ) : (
                  <strong>{r.label}</strong>
                )}{" "}
                — {r.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function FindingRow({ f, onSelectItem }: { f: Finding; onSelectItem: (id: string) => void }) {
  return (
    <div className={`finding sev-${f.severity}`}>
      <span className="sev" title={SEVERITY[f.severity].label}>
        {SEVERITY[f.severity].icon}
      </span>
      <div>
        <p className="f-cat">{CATEGORY_LABEL[f.category]}</p>
        <p>{f.message}</p>
        {f.evidence && <blockquote>“{f.evidence}”</blockquote>}
        {f.legal_basis && <p className="f-legal">{f.legal_basis}</p>}
        {f.item_ids.length > 0 && (
          <button type="button" className="btn link" onClick={() => onSelectItem(f.item_ids[0])}>
            Show in document
          </button>
        )}
      </div>
    </div>
  );
}
