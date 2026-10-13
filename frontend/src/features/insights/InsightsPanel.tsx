import { useEffect, useRef } from "react";
import type { AnalysisResult, KeyItem } from "../../api/types";
import { byImportance, daysUntil, formatDate, KIND_META } from "../../lib/kinds";
import { datedItems, downloadIcs } from "../calendar/ics";
import type { Verification } from "../ocr/verifyHighlights";

interface Props {
  result: AnalysisResult;
  verifications: Record<string, Verification> | null;
  ocrState: "running" | "done" | "failed";
  activeItemId: string | null;
  activeBlockId: string | null;
  onSelectItem: (id: string) => void;
  onSelectBlock: (id: string | null) => void;
}

export function InsightsPanel(props: Props) {
  const { result } = props;
  const dated = datedItems(result);
  return (
    <div className="insights">
      <section className="card summary">
        <p className="eyebrow">{result.document_type}</p>
        {result.sender && <p className="sender">From {result.sender}</p>}
        <p className="summary-text" dir="auto">{result.summary}</p>
        {result.confidence_note && <p className="note">⚠ {result.confidence_note}</p>}
      </section>

      {result.action_steps.length > 0 && (
        <section className="card">
          <h2>What to do</h2>
          <ol className="steps">
            {result.action_steps.map((s, i) => (
              <li key={i} dir="auto">{s}</li>
            ))}
          </ol>
          {dated.length > 0 && (
            <button type="button" className="btn secondary" onClick={() => downloadIcs(dated, result)}>
              📅 Add {dated.length === 1 ? "deadline" : `all ${dated.length} dates`} to calendar
            </button>
          )}
        </section>
      )}

      <KeyItemList {...props} />
      <TranslationList {...props} />
    </div>
  );
}

function VerifyBadge({ v, ocrState }: { v?: Verification; ocrState: Props["ocrState"] }) {
  if (ocrState === "running") return <span className="badge pending">checking on page…</span>;
  if (ocrState === "failed" || !v) return null;
  return v.verified ? (
    <span className="badge ok" title="This text was independently found on your photo by OCR.">
      ✓ found on page
    </span>
  ) : (
    <span className="badge approx" title="OCR could not confirm the exact spot; the box is the AI's estimate.">
      ≈ approximate spot
    </span>
  );
}

function KeyItemList({ result, verifications, ocrState, activeItemId, onSelectItem }: Props) {
  const items = [...result.key_items].sort(byImportance);
  const refs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    if (activeItemId) refs.current.get(activeItemId)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeItemId]);

  if (!items.length) return null;
  return (
    <section className="card">
      <h2>Important details</h2>
      <p className="hint">Tap a card to see where it is in your document.</p>
      <ul className="key-items">
        {items.map((item) => (
          <li key={item.id}>
            <KeyItemCard
              item={item}
              number={result.key_items.indexOf(item) + 1}
              result={result}
              verification={verifications?.[item.id]}
              ocrState={ocrState}
              active={activeItemId === item.id}
              onSelect={() => onSelectItem(item.id)}
              cardRef={(el) => {
                if (el) refs.current.set(item.id, el);
              }}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function KeyItemCard({
  item,
  number,
  result,
  verification,
  ocrState,
  active,
  onSelect,
  cardRef,
}: {
  item: KeyItem;
  number: number;
  result: AnalysisResult;
  verification?: Verification;
  ocrState: Props["ocrState"];
  active: boolean;
  onSelect: () => void;
  cardRef: (el: HTMLElement | null) => void;
}) {
  const meta = KIND_META[item.kind];
  const days = item.date ? daysUntil(item.date) : null;
  return (
    <article
      ref={cardRef}
      className={`key-item tone-${meta.tone} ${active ? "is-active" : ""}`}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
      tabIndex={0}
      role="button"
      aria-pressed={active}
    >
      <header>
        <span className="marker">{number}</span>
        <span className="kind">
          {meta.icon} {meta.label}
        </span>
        {item.importance === "high" && <span className="badge high">Important</span>}
      </header>
      <h3 dir="auto">{item.label}</h3>
      <p className="value">{item.value}</p>
      {item.date && (
        <p className={`due ${days !== null && days < 7 ? "soon" : ""}`}>
          {formatDate(item.date)}
          {days !== null && (days >= 0 ? ` · in ${days} day${days === 1 ? "" : "s"}` : ` · ${-days} days ago`)}
        </p>
      )}
      <p className="explanation" dir="auto">{item.explanation}</p>
      <blockquote title="Original text">“{item.source_quote}”</blockquote>
      <footer>
        <VerifyBadge v={verification} ocrState={ocrState} />
        {item.date && (
          <button
            type="button"
            className="btn link"
            onClick={(e) => {
              e.stopPropagation();
              downloadIcs([item], result);
            }}
          >
            📅 Add to calendar
          </button>
        )}
      </footer>
    </article>
  );
}

function TranslationList({ result, activeBlockId, onSelectBlock }: Props) {
  return (
    <section className="card">
      <details>
        <summary>
          <h2>Full translation</h2>
        </summary>
        <div className="translation">
          {result.blocks.map((b) => (
            <div
              key={b.id}
              className={`t-block ${activeBlockId === b.id ? "is-active" : ""}`}
              onMouseEnter={() => onSelectBlock(b.id)}
              onMouseLeave={() => onSelectBlock(null)}
            >
              <p className="t-translation" dir="auto">{b.translation}</p>
              <p className="t-original">{b.original}</p>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
