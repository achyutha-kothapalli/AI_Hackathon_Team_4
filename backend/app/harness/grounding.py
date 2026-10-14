"""'Nothing invented': every extracted fact must be traceable to the letter.

For each key item:
  1. its `source_quote` must occur in the transcribed letter text, and
  2. every number, amount and date in the item must occur in that quote.

This is checked in code, independent of the model. (The browser adds a second,
fully independent check by finding the quote on the photo with OCR.)
"""

from datetime import date

from ..schemas.analysis import AnalysisResult, KeyItem
from ..schemas.harness import Finding, FindingCategory, ItemCheck, Severity
from . import text

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
    "quote_paraphrased": (
        Severity.info,
        "“{label}”: the quoted text is close to, but not exactly, the letter's wording.",
    ),
}

BLOCKING = {Severity.critical, Severity.warning}


def transcript(result: AnalysisResult) -> str:
    return "\n".join(b.original for b in result.blocks)


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
                issues.append(("date_not_in_quote" if d in doc_dates else "date_not_in_document", d.strftime("%d.%m.%Y")))
    return issues


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
    return checks, findings
