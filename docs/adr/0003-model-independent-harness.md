# 0003 — Accuracy & safety harness independent of the model

**Status:** Accepted

## Context

The judging criterion is "nothing lost or invented, with safeguards in place".
Prompting alone cannot guarantee it: models occasionally misread numbers,
paraphrase quotes, skip facts, or follow instructions hidden in a document.
Users act on deadlines and amounts, so errors have real consequences.

## Decision

Every AI answer passes through a harness of deterministic checks before it
reaches the user (`backend/app/harness/`):

- a common contract (`base.py`): each check receives a read-only `CheckContext`
  and returns a `CheckOutput`; checks are independent and listed in `checks/__init__.py`
- **grounding:** every fact's quote must be in the letter and its numbers, amounts
  and dates in the quote ("nothing invented")
- **knowledge rules:** required facts per document type and coverage of every
  deadline, amount, IBAN and reference printed in the letter ("nothing lost"),
  plus legal periods, scam signs and escalation
- **injection** and **quality** safeguards

The harness reports; it never edits the answer. The browser adds a second,
fully independent verification with its own OCR.

## Consequences

- Guarantees hold for every analyzer, including future ones.
- Effectiveness is measurable: a fault-injection benchmark (71/71 faults
  detected, 0 false alarms) runs in CI and fails the build if it regresses.
- Checks can be owned and developed by different people without conflicts.
- Rule-based checks need care to avoid false alarms; the benchmark's clean
  runs guard against that.

## Alternatives considered

- **A second LLM as a judge:** costly, slow, and not deterministic, so it can
  make the same errors it is meant to catch.
- **Correcting the answer automatically:** risks silently introducing errors;
  showing findings to the user is more honest.
