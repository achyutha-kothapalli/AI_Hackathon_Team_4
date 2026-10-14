// The explanation, card by card (mockup order): safety first, then what the
// letter is, the deadline, the steps, the key facts, the consequences and
// where to get help. Everything is filled from /api/analyze.

import { useState } from "react";
import type { AnalysisResult, AnalyzeResponse, Finding, KeyItem } from "../../api/types";
import { byImportance, daysUntil, formatDate } from "../../lib/kinds";
import { contentAttrs } from "../../lib/languages";
import { Icon } from "../../ui/Icon";
import { useCopy } from "../../ui/toast";
import { datedItems } from "../calendar/ics";
import type { OcrState } from "../analysis/useAnalysis";
import type { Coverage } from "../ocr/verifyHighlights";
import { countdownText, dueDate, primaryDeadline, urgency } from "./deadline";

interface Props {
  response: AnalyzeResponse;
  resultLanguage: string;
  targetLanguage: string;
  coverage: Coverage | null;
  ocrState: OcrState;
  calendarAdded: boolean;
  onShowInLetter: (itemId: string) => void;
  onOpenOriginal: () => void;
  onOpenCalendar: () => void;
  onExplainAgain: () => void;
  onScanAnother: () => void;
}

export function ResultScreen(props: Props) {
  const { response, resultLanguage, targetLanguage } = props;
  const { result, checks } = response;
  const deadline = primaryDeadline(result);
  const [done, setDone] = useState<Set<number>>(() => new Set());
  const allDone = result.action_steps.length > 0 && done.size === result.action_steps.length;
  const notGrounded = (id: string) => checks.item_checks[id]?.grounded === false;

  const facts = result.key_items.filter((k) => k.kind !== "consequence" && k.id !== deadline?.id).sort(byImportance);
  const consequences = result.key_items.filter((k) => k.kind === "consequence");
  const warningFindings = checks.findings.filter((f) => f.severity === "warning" && f.category !== "grounding");

  return (
    <div className="screen result">
      {resultLanguage !== targetLanguage && (
        <div className="note">
          <Icon name="globe" />
          <span>These results are in {resultLanguage}.</span>
          <button type="button" className="mini-btn note-action" onClick={props.onExplainAgain}>
            Explain again in {targetLanguage}
          </button>
        </div>
      )}

      <SafetyCard response={response} coverage={props.coverage} />

      <div className="result-body" {...contentAttrs(resultLanguage)}>
        <section className="card summary">
          <h2 className="eyebrow">What is this?</h2>
          <div className="sender-row">
            <span className="avatar">
              <Icon name={checks.scam_suspected ? "alert" : "landmark"} />
            </span>
            <div>
              <div className="sender-name">{result.sender ?? "Unknown sender"}</div>
              <span className="chip">{result.document_type}</span>
            </div>
          </div>
          <p className={`summary-text ${result.summary.length > 140 ? "is-long" : ""}`}>{result.summary}</p>
        </section>

        <DeadlineStrip
          item={deadline}
          allDone={allDone}
          hasSteps={result.action_steps.length > 0}
          onShowInLetter={props.onShowInLetter}
        />

        {result.action_steps.length > 0 && (
          <section className="card actions">
            <div className="card-head">
              <span className="head-icon blue">
                <Icon name="check" />
              </span>
              <div>
                <h2 className="card-title">What do I have to do?</h2>
                <p className="card-sub">Tick off each step as you go.</p>
              </div>
            </div>
            <ol className="steps">
              {result.action_steps.map((step, i) => {
                const isDone = done.has(i);
                return (
                  <li key={i} className={`step ${isDone ? "is-done" : ""}`}>
                    <button
                      type="button"
                      className="step-check"
                      aria-pressed={isDone}
                      aria-label={step}
                      onClick={() =>
                        setDone((prev) => {
                          const next = new Set(prev);
                          if (next.has(i)) next.delete(i);
                          else next.add(i);
                          return next;
                        })
                      }
                    >
                      <span className="step-num">{i + 1}</span>
                      <Icon name="check" className="step-tick" />
                    </button>
                    <div className="step-body">
                      <h3 className="step-title">{step}</h3>
                    </div>
                  </li>
                );
              })}
            </ol>
            {datedItems(result).length > 0 && (
              <button
                type="button"
                className={`btn btn-cal ${props.calendarAdded ? "is-added" : ""}`}
                onClick={props.onOpenCalendar}
              >
                <Icon name={props.calendarAdded ? "calendarCheck" : "calendarPlus"} />
                {props.calendarAdded ? (
                  <>
                    Added to calendar<span className="cal-edit">· Edit</span>
                  </>
                ) : (
                  "Add to calendar"
                )}
              </button>
            )}
          </section>
        )}

        {facts.length > 0 && (
          <section className="card plain">
            <div className="card-head">
              <span className="head-icon blue">
                <Icon name="file" />
              </span>
              <div>
                <h2 className="card-title">Key details</h2>
                <p className="card-sub">Tap a value to copy it.</p>
              </div>
            </div>
            <div className="facts">
              {facts.map((item) => (
                <Fact
                  key={item.id}
                  item={item}
                  unverified={notGrounded(item.id)}
                  onShowInLetter={props.onShowInLetter}
                />
              ))}
            </div>
          </section>
        )}

        {(consequences.length > 0 || warningFindings.length > 0) && (
          <WarningsCard consequences={consequences} findings={warningFindings} onShowInLetter={props.onShowInLetter} />
        )}

        <HelpCard result={result} response={response} />
      </div>

      <button type="button" className="btn btn-secondary btn-block" onClick={props.onOpenOriginal}>
        <Icon name="file" />
        View original letter
        <Icon name="arrowUpRight" className="trail flip-rtl" />
      </button>
      <TrustLine response={response} ocrState={props.ocrState} />
      <p className="disclaimer">
        <Icon name="info" />
        Automated explanation. Always check the original. This is not legal advice — for legal decisions, ask the sender
        or an advice centre.
      </p>
      <button type="button" className="btn btn-ghost btn-block" onClick={props.onScanAnother}>
        <Icon name="refresh" />
        Explain another letter
      </button>
    </div>
  );
}

function SafetyCard({ response, coverage }: { response: AnalyzeResponse; coverage: Coverage | null }) {
  const { result, checks } = response;
  const critical = checks.findings.filter((f) => f.severity === "critical");
  const notes: string[] = [];
  if (result.image_quality === "unreadable")
    notes.push("The photo is very hard to read. Take a new, sharp photo in good light.");
  if (result.image_quality === "poor")
    notes.push("The photo is partly hard to read. Check the details against the letter.");
  if (result.confidence_note) notes.push(result.confidence_note);
  if (coverage && coverage.ratio < 0.9) {
    const examples = coverage.missing.slice(0, 4).join("”, “");
    notes.push(
      `Some text on the photo may not have been read${examples ? `, e.g. “${examples}”` : ""}. Compare with the letter.`,
    );
  }

  return (
    <>
      {(checks.scam_suspected || critical.length > 0 || result.suspicious_instructions) && (
        <section className="card alert-card" role="alert">
          <div className="card-head">
            <span className="head-icon red">
              <Icon name="alert" />
            </span>
            <div>
              <h2 className="card-title">
                {checks.scam_suspected ? "This letter may be a scam" : "Check this before you act"}
              </h2>
              {checks.scam_suspected && (
                <p className="card-sub">
                  Do not pay or reply before checking it with the sender, using contact details you look up yourself.
                </p>
              )}
            </div>
          </div>
          <ul className="alert-list">
            {result.suspicious_instructions && (
              <li>
                This letter contains hidden instructions aimed at AI tools. We ignored them, but treat the letter with
                care.
                <blockquote>“{result.suspicious_instructions}”</blockquote>
              </li>
            )}
            {critical.map((f) => (
              <FindingItem key={f.rule_id + f.item_ids.join()} f={f} />
            ))}
          </ul>
        </section>
      )}
      {notes.length > 0 && (
        <div className="note">
          <Icon name="info" />
          <span>{notes.join(" ")}</span>
        </div>
      )}
    </>
  );
}

function FindingItem({ f }: { f: Finding }) {
  return (
    <li>
      {f.message}
      {f.evidence && <blockquote>“{f.evidence}”</blockquote>}
    </li>
  );
}

function RefLink({ itemId, onShowInLetter }: { itemId: string; onShowInLetter: (id: string) => void }) {
  return (
    <button type="button" className="ref-link" onClick={() => onShowInLetter(itemId)}>
      in letter
      <Icon name="arrowUpRight" className="flip-rtl" />
    </button>
  );
}

function DeadlineStrip({
  item,
  allDone,
  hasSteps,
  onShowInLetter,
}: {
  item: KeyItem | null;
  allDone: boolean;
  hasSteps: boolean;
  onShowInLetter: (id: string) => void;
}) {
  if (allDone) {
    return (
      <section className="deadline u-green">
        <div className="date-tile ok">
          <Icon name="checkCircle" />
        </div>
        <div className="dl-body">
          <div className="dl-label">All done</div>
          <div className="dl-date">You’ve completed every step.</div>
        </div>
      </section>
    );
  }
  if (!item) {
    return hasSteps ? (
      <section className="deadline u-blue">
        <div className="date-tile info">
          <Icon name="calendar" />
        </div>
        <div className="dl-body">
          <div className="dl-label">No deadline found</div>
          <div className="dl-date">Still, check the letter for anything time-sensitive.</div>
        </div>
      </section>
    ) : (
      <section className="deadline u-green">
        <div className="date-tile ok">
          <Icon name="checkCircle" />
        </div>
        <div className="dl-body">
          <div className="dl-label">Nothing to do</div>
          <div className="dl-date">This letter seems to be for your information only.</div>
        </div>
      </section>
    );
  }
  const due = dueDate(item);
  if (!due) {
    return (
      <section className="deadline u-red">
        <div className="date-tile alert">
          <Icon name="clock" />
        </div>
        <div className="dl-body">
          <div className="dl-label">{item.label}</div>
          <div className="dl-date">{item.value}</div>
          <RefLink itemId={item.id} onShowInLetter={onShowInLetter} />
        </div>
      </section>
    );
  }
  const n = daysUntil(due);
  const d = new Date(`${due}T00:00:00`);
  return (
    <section className={`deadline u-${urgency(n)}`}>
      <div className="date-tile">
        <span className="dt-month">{d.toLocaleDateString("en-GB", { month: "short" })}</span>
        <span className="dt-day">{d.getDate()}</span>
      </div>
      <div className="dl-body">
        <div className="dl-label">{item.label}</div>
        <div className="dl-date">{formatDate(due, "en-GB")}</div>
        <RefLink itemId={item.id} onShowInLetter={onShowInLetter} />
      </div>
      <div className="dl-count">
        <span className="dot" />
        {countdownText(n)}
      </div>
    </section>
  );
}

function Fact({
  item,
  unverified,
  onShowInLetter,
}: {
  item: KeyItem;
  unverified: boolean;
  onShowInLetter: (id: string) => void;
}) {
  const copy = useCopy();
  return (
    <div className="fact">
      <button
        type="button"
        className="fact-copy"
        onClick={() => copy(item.value)}
        aria-label={`${item.label}: ${item.value}. Tap to copy`}
      >
        <span className="fact-label">{item.label}</span>
        <span className="fact-value" dir="ltr">
          {item.value}
        </span>
        <span className="fact-icon">
          <Icon name="copy" />
        </span>
      </button>
      {item.explanation && <p className="fact-note">{item.explanation}</p>}
      <div className="fact-meta">
        <RefLink itemId={item.id} onShowInLetter={onShowInLetter} />
        {unverified && (
          <span className="tag tag-warn" title="This value was not found in the letter text. Check it before acting.">
            <Icon name="alert" />
            not verified
          </span>
        )}
        {item.confidence === "low" && <span className="tag tag-warn">hard to read</span>}
      </div>
    </div>
  );
}

const LEVEL = { low: 1, medium: 2, high: 3 } as const;

function WarningsCard({
  consequences,
  findings,
  onShowInLetter,
}: {
  consequences: KeyItem[];
  findings: Finding[];
  onShowInLetter: (id: string) => void;
}) {
  return (
    <section className="card warnings">
      <div className="card-head">
        <span className="head-icon red">
          <Icon name="alert" />
        </span>
        <div>
          <h2 className="card-title">What happens if I don’t?</h2>
          <p className="card-sub">Consequences named in the letter, and points to watch.</p>
        </div>
      </div>
      <ol className="escalation">
        {[...consequences]
          .sort(byImportance)
          .reverse()
          .map((c) => (
            <li key={c.id} className={`esc esc-${LEVEL[c.importance]}`}>
              <span className="esc-label">{c.label}</span>
              <div className="esc-text">
                <p>{c.explanation || c.value}</p>
                <RefLink itemId={c.id} onShowInLetter={onShowInLetter} />
              </div>
            </li>
          ))}
        {findings.map((f) => (
          <li key={f.rule_id + f.item_ids.join()} className="esc esc-2">
            <span className="esc-label">Please check</span>
            <div className="esc-text">
              <p>{f.message}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

const PHONE = /\+?\d[\d\s/()-]{5,}\d/;

function HelpCard({ result, response }: { result: AnalysisResult; response: AnalyzeResponse }) {
  const { escalation, findings } = response.checks;
  const infos = findings.filter((f) => f.severity === "info" && !escalation?.reason.includes(f.message));
  const phones = result.key_items
    .filter((k) => k.kind === "contact")
    .map((k) => ({ item: k, number: k.value.match(PHONE)?.[0] }))
    .filter((p): p is { item: KeyItem; number: string } => !!p.number);
  if (!escalation && !infos.length && !phones.length) return null;

  return (
    <section className="card tips" dir="ltr" lang="en">
      <div className="card-head">
        <span className="head-icon green">
          <Icon name="bulb" />
        </span>
        <h2 className="card-title">{escalation ? "Where to get help" : "Good to know"}</h2>
      </div>
      {escalation && (
        <>
          <p className="help-reason">{escalation.reason}</p>
          <ul className="help-list">
            {escalation.resources.map((r) => (
              <li key={r.id}>
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {r.label}
                  </a>
                ) : (
                  <strong>{r.label}</strong>
                )}
                <p>{r.description}</p>
              </li>
            ))}
          </ul>
        </>
      )}
      {infos.length > 0 && (
        <ul className="tip-list">
          {infos.map((f) => (
            <li key={f.rule_id + f.item_ids.join()}>
              {f.message}
              {f.legal_basis && <span className="muted"> ({f.legal_basis})</span>}
            </li>
          ))}
        </ul>
      )}
      {phones.map(({ item, number }) => (
        <a key={item.id} className="contact" href={`tel:${number.replace(/[^+\d]/g, "")}`}>
          <span className="contact-icon">
            <Icon name="phone" />
          </span>
          <span className="contact-body">
            <span className="contact-label">Call {item.label.toLowerCase()}</span>
            <span className="contact-num" dir="ltr">
              {item.value}
            </span>
          </span>
          <Icon name="next" className="chev flip-rtl" />
        </a>
      ))}
    </section>
  );
}

function TrustLine({ response, ocrState }: { response: AnalyzeResponse; ocrState: OcrState }) {
  const { total_items, grounded_items } = response.checks.summary;
  if (!total_items) return null;
  return (
    <p className="trust">
      <Icon name="shield" />
      {grounded_items} of {total_items} details traced back to the letter text
      {ocrState === "running" && " · checking positions on your photo…"}
    </p>
  );
}
