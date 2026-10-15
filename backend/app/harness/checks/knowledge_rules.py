"""Executes knowledge-graph rules against an analysis.

Rules come from app/knowledge/<name>/rules.json; only rules attached to the
document's class or one of its ancestors run (see KnowledgeGraph.rules_for).
"""

import re

from ...knowledge import KnowledgeGraph
from ...knowledge import models as m
from ...schemas.analysis import AnalysisResult, KeyItem
from ...schemas.harness import Finding, FindingCategory, Severity
from .. import text
from ..base import CheckContext, CheckOutput

_PERIOD = re.compile(r"\b(\w+)\s+(wochen?|monat(?:e|en|s)?|tag(?:e|en)?|werktag(?:e|en)?)\b")


def _item_text(item: KeyItem) -> str:
    return text.norm(" ".join([item.label, item.value, item.source_quote, item.explanation]))


def _matching_items(result: AnalysisResult, kind, keywords: list[str]) -> list[KeyItem]:
    out = []
    for item in result.key_items:
        if item.kind != kind:
            continue
        if keywords and not any(k in _item_text(item) for k in keywords):
            continue
        out.append(item)
    return out


def _matching_medications(result: AnalysisResult, kind, keywords: list[str]) -> bool:
    """Structured medications satisfy rules that require a 'medication' fact."""
    if kind != "medication":
        return False
    return any(
        not keywords or any(k in text.norm(f"{md.name} {md.source_quote}") for k in keywords)
        for md in result.medications
    )


def _sentence_at(body: str, match: re.Match) -> str:
    """The sentence (or line) of `body` that contains the match."""
    start = max(body.rfind(c, 0, match.start()) for c in ".!?\n") + 1
    ends = [i for i in (body.find(c, match.end()) for c in ".!?\n") if i != -1]
    return body[start : min(ends) if ends else len(body)]


def _output_backed(rule, result: AnalysisResult, generated: str, match: re.Match, doc: str) -> bool:
    """Is the AI's statement supported by the document? See OutputPatternRule."""
    sentence = text.alnum(_sentence_at(generated, match))
    named = [md for md in result.medications if text.alnum(md.name) and text.alnum(md.name) in sentence]
    if named and rule.backed_by_medication_status:
        return all(md.status.value in rule.backed_by_medication_status for md in named)
    return bool(rule.unless_source_pattern and re.search(rule.unless_source_pattern, doc, re.IGNORECASE))


def _legal_note(kg: KnowledgeGraph, legal_id: str | None) -> str | None:
    if not legal_id:
        return None
    lb = kg.legal(legal_id)
    return f"{lb.label}: {lb.text}"


def apply_rules(result: AnalysisResult, kg: KnowledgeGraph, class_id: str, doc: str) -> CheckOutput:
    out = CheckOutput()
    covered = [text.tokens(f"{i.source_quote} | {i.value}") for i in result.key_items]
    covered += [
        text.tokens(f"{md.source_quote} | {md.name} {md.strength or ''}") for md in result.medications
    ]
    is_authority = kg.has_attr(class_id, "is_authority")

    for rule in kg.rules_for(class_id):
        legal = _legal_note(kg, rule.legal_basis)

        if isinstance(rule, m.RequiresItemRule):
            if not _matching_items(result, rule.item_kind, rule.match_any) and not _matching_medications(
                result, rule.item_kind, rule.match_any
            ):
                out.findings.append(
                    Finding(
                        rule_id=rule.id,
                        category=FindingCategory.completeness,
                        severity=rule.severity,
                        message=rule.message,
                        legal_basis=legal,
                    )
                )

        elif isinstance(rule, m.SignalCoverageRule):
            seen: set[str] = set()
            for match in re.finditer(rule.pattern, doc, re.IGNORECASE):
                fact = match.group("fact").strip().rstrip(".,;:")
                key = text.tokens(fact)
                if not key.strip() or key in seen or any(key in c for c in covered):
                    continue
                seen.add(key)
                out.findings.append(
                    Finding(
                        rule_id=rule.id,
                        category=FindingCategory.completeness,
                        severity=rule.severity,
                        message=rule.message.format(fact=fact),
                        evidence=text.context(doc, match),
                        legal_basis=legal,
                    )
                )

        elif isinstance(rule, m.ExpectedPeriodRule):
            for item in _matching_items(result, "deadline", rule.match_any):
                quote = text.norm(item.source_quote)
                stated = _PERIOD.search(quote)
                if stated and not any(p in quote for p in rule.period_phrases):
                    out.findings.append(
                        Finding(
                            rule_id=rule.id,
                            category=FindingCategory.legal,
                            severity=rule.severity,
                            message=f"{rule.message} (Read: “{stated.group(0)}”.)",
                            item_ids=[item.id],
                            evidence=item.source_quote,
                            legal_basis=legal,
                        )
                    )

        elif isinstance(rule, m.TextPatternRule):
            match = re.search(rule.pattern, doc, re.IGNORECASE)
            if match:
                out.findings.append(
                    Finding(
                        rule_id=rule.id,
                        category=rule.category,
                        severity=rule.severity,
                        message=rule.message,
                        evidence=text.context(doc, match),
                        legal_basis=legal,
                    )
                )

        elif isinstance(rule, m.ForeignIbanRule):
            if is_authority:
                for iban in text.find_ibans(doc):
                    if not iban.startswith("DE"):
                        out.findings.append(
                            Finding(
                                rule_id=rule.id,
                                category=rule.category,
                                severity=rule.severity,
                                message=rule.message.format(fact=text.format_iban(iban)),
                                evidence=text.format_iban(iban),
                            )
                        )

        elif isinstance(rule, m.IbanChecksumRule):
            for iban in text.find_ibans(doc):
                if not text.iban_valid(iban):
                    out.findings.append(
                        Finding(
                            rule_id=rule.id,
                            category=rule.category,
                            severity=rule.severity,
                            message=rule.message.format(fact=text.format_iban(iban)),
                            evidence=text.format_iban(iban),
                        )
                    )

        elif isinstance(rule, m.EscalateRule):
            out.escalation_reasons.append(rule.reason)
            out.add_resources(kg, rule.resources)

        elif isinstance(rule, m.EscalateOnPatternRule):
            match = re.search(rule.pattern, doc, re.IGNORECASE)
            if match:
                out.escalation_reasons.append(rule.reason.format(fact=match.group(0)))
                out.add_resources(kg, rule.resources)
                out.findings.append(
                    Finding(
                        rule_id=rule.id,
                        category=FindingCategory.escalation,
                        severity=Severity.info,
                        message=rule.reason.format(fact=match.group(0)),
                        evidence=text.context(doc, match),
                    )
                )

        elif isinstance(rule, m.OutputPatternRule):
            generated = text.generated_text(result)
            match = re.search(rule.pattern, generated, re.IGNORECASE)
            if match and not _output_backed(rule, result, generated, match, doc):
                out.findings.append(
                    Finding(
                        rule_id=rule.id,
                        category=rule.category,
                        severity=rule.severity,
                        message=rule.message,
                        evidence=text.context(generated, match),
                        legal_basis=legal,
                    )
                )
    return out


class KnowledgeRulesCheck:
    """Runs the domain's rules.json for the document's class and all its ancestors."""

    name = "knowledge_rules"

    def run(self, ctx: CheckContext) -> CheckOutput:
        return apply_rules(ctx.result, ctx.knowledge, ctx.document_class.id, ctx.transcript)
