"""'Nothing invented': every extracted fact must be traceable to the letter.

For each key item:
  1. its `source_quote` must occur in the transcribed letter text, and
  2. every number, amount and date in the item must occur in that quote.

For each medication (the most safety-critical facts):
  1. its quote must occur in the document,
  2. its name must occur in the quote,
  3. its strength must occur in the quote, and
  4. its intake doses must match the printed schedule slot by slot
     (e.g. 1-0-1-0), or at least occur in the quote.

This is checked in code, independent of the model. (The browser adds a second,
fully independent check by finding the quote on the photo with OCR.)
"""

from datetime import date

from ...schemas.analysis import AnalysisResult, KeyItem, Medication
from ...schemas.harness import Finding, FindingCategory, ItemCheck, Severity
from .. import text
from ..base import CheckContext, CheckOutput, transcript

# Issue code -> (severity, message template)
ISSUES: dict[str, tuple[Severity, str]] = {
    "missing_quote": (Severity.critical, "“{label}” has no quote from the letter, so it cannot be verified."),
    "quote_not_in_document": (
        Severity.critical,
        "“{label}” cites text that does not appear in the letter. Treat this detail as unverified.",
    ),
    "value_not_in_quote": (
        Severity.critical,
        "“{label}”: the number(s) {detail} do not appear in the quoted letter text. Check the letter.",
    ),
    "amount_mismatch": (
        Severity.critical,
        "“{label}”: the amount {detail} does not match the quoted letter text. Check the letter.",
    ),
    "date_not_in_document": (
        Severity.warning,
        "“{label}”: the date {detail} is not printed in the letter; it was calculated or inferred. Verify it yourself.",
    ),
    "date_not_in_quote": (
        Severity.info,
        "“{label}”: the date {detail} appears elsewhere in the letter, not in the quoted text.",
    ),
    "name_not_in_quote": (
        Severity.critical,
        "Medicine “{label}”: the name does not appear in the quoted document text. Check the plan.",
    ),
    "strength_not_in_quote": (
        Severity.critical,
        "Medicine “{label}”: the strength {detail} does not appear in the quoted text. Check the plan.",
    ),
    "dose_mismatch": (
        Severity.critical,
        "Medicine “{label}”: the intake {detail} does not match the printed schedule. Check the plan.",
    ),
    "dose_not_in_quote": (
        Severity.critical,
        "Medicine “{label}”: the dose(s) {detail} do not appear in the quoted text. Check the plan.",
    ),
    "quote_paraphrased": (
        Severity.info,
        "“{label}”: the quoted text is close to, but not exactly, the letter's wording.",
    ),
}

BLOCKING = {Severity.critical, Severity.warning}


def _check(item: KeyItem, doc_alnum: str, doc_words: set[str], doc_dates: set) -> list[tuple[str, str]]:
    issues: list[tuple[str, str]] = []
    quote = item.source_quote or ""

    if not text.alnum(quote):
        return [("missing_quote", "")]
    if text.alnum(quote) not in doc_alnum:
        q_words = text.words(quote)
        overlap = sum(1 for w in q_words if w in doc_words) / max(len(q_words), 1)
        issues.append(("quote_paraphrased", "") if overlap >= 0.8 else ("quote_not_in_document", ""))

    missing = text.numbers(item.value) - text.numbers(quote)
    if missing:
        issues.append(("value_not_in_quote", ", ".join(str(n) for n in sorted(missing))))

    if item.amount is not None and not any(abs(a - item.amount) < 0.005 for a in text.amounts(quote)):
        issues.append(("amount_mismatch", f"{item.amount:.2f}"))

    if item.date:
        try:
            d = date.fromisoformat(item.date)
        except ValueError:
            issues.append(("date_not_in_document", item.date))
        else:
            if d not in text.dates(quote):
                issues.append(
                    (
                        "date_not_in_quote" if d in doc_dates else "date_not_in_document",
                        d.strftime("%d.%m.%Y"),
                    )
                )
    return issues


def _quote_issues(quote: str, doc_alnum: str, doc_words: set[str]) -> list[tuple[str, str]]:
    if not text.alnum(quote):
        return [("missing_quote", "")]
    if text.alnum(quote) not in doc_alnum:
        q_words = text.words(quote)
        overlap = sum(1 for w in q_words if w in doc_words) / max(len(q_words), 1)
        return [("quote_paraphrased", "") if overlap >= 0.8 else ("quote_not_in_document", "")]
    return []


def _fmt_dose(values: tuple[float, ...]) -> str:
    return "-".join(
        ("½" if v == 0.5 else "¼" if v == 0.25 else "¾" if v == 0.75 else f"{v:g}") for v in values
    )


def _check_medication(med: Medication, doc_alnum: str, doc_words: set[str]) -> list[tuple[str, str]]:
    quote = med.source_quote or ""
    issues = _quote_issues(quote, doc_alnum, doc_words)
    if issues and issues[0][0] == "missing_quote":
        return issues

    if text.alnum(med.name) and text.alnum(med.name) not in text.alnum(quote):
        issues.append(("name_not_in_quote", med.name))

    if med.strength:
        missing = text.numbers(med.strength) - text.numbers(quote)
        if missing:
            issues.append(("strength_not_in_quote", med.strength))

    columns = (med.morning, med.noon, med.evening, med.night)
    if any(c is not None and c.strip() for c in columns):
        stated = tuple(text.dose_value(c) for c in columns)
        printed = text.schedules(quote)
        if printed:
            if stated not in printed:
                issues.append(("dose_mismatch", f"{_fmt_dose(stated)} (printed: {_fmt_dose(printed[0])})"))
        else:
            nonzero = " ".join(c for c in columns if c and text.dose_value(c) != 0)
            missing = text.numbers(nonzero) - text.numbers(quote)
            if missing:
                issues.append(("dose_not_in_quote", ", ".join(str(n) for n in sorted(missing))))

    if med.schedule_text:
        missing = text.numbers(med.schedule_text) - text.numbers(quote)
        if missing:
            issues.append(("dose_not_in_quote", ", ".join(str(n) for n in sorted(missing))))
    return issues


def _findings(item_id: str, label: str, quote: str, issues: list[tuple[str, str]]) -> list[Finding]:
    out = []
    for code, detail in issues:
        severity, template = ISSUES[code]
        out.append(
            Finding(
                rule_id=f"G-{code.upper().replace('_', '-')}",
                category=FindingCategory.grounding,
                severity=severity,
                message=template.format(label=label, detail=detail),
                item_ids=[item_id],
                evidence=quote or None,
            )
        )
    return out


def check_grounding(result: AnalysisResult) -> tuple[dict[str, ItemCheck], list[Finding]]:
    doc = transcript(result)
    doc_alnum, doc_words, doc_dates = text.alnum(doc), set(text.words(doc)), text.dates(doc)
    checks: dict[str, ItemCheck] = {}
    findings: list[Finding] = []
    for item in result.key_items:
        issues = _check(item, doc_alnum, doc_words, doc_dates)
        grounded = not any(ISSUES[code][0] in BLOCKING for code, _ in issues)
        checks[item.id] = ItemCheck(item_id=item.id, grounded=grounded, issues=[c for c, _ in issues])
        for code, detail in issues:
            severity, template = ISSUES[code]
            findings.append(
                Finding(
                    rule_id=f"G-{code.upper().replace('_', '-')}",
                    category=FindingCategory.grounding,
                    severity=severity,
                    message=template.format(label=item.label, detail=detail),
                    item_ids=[item.id],
                    evidence=item.source_quote or None,
                )
            )
    for med in result.medications:
        issues = _check_medication(med, doc_alnum, doc_words)
        grounded = not any(ISSUES[code][0] in BLOCKING for code, _ in issues)
        checks[med.id] = ItemCheck(item_id=med.id, grounded=grounded, issues=[c for c, _ in issues])
        findings += _findings(med.id, med.name, med.source_quote, issues)
    return checks, findings


class GroundingCheck:
    """'Nothing invented': every fact must be traceable to the letter text."""

    name = "grounding"

    def run(self, ctx: CheckContext) -> CheckOutput:
        item_checks, findings = check_grounding(ctx.result)
        return CheckOutput(findings=findings, item_checks=item_checks)
