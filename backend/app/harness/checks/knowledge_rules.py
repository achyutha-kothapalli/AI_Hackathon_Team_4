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


def _legal_note(kg: KnowledgeGraph, legal_id: str | None) -> str | None:
    if not legal_id:
        return None
    lb = kg.legal(legal_id)
    return f"{lb.label}: {lb.text}"


def apply_rules(result: AnalysisResult, kg: KnowledgeGraph, class_id: str, doc: str) -> CheckOutput:
    out = CheckOutput()
    covered = [text.alnum(i.source_quote + " " + i.value) for i in result.key_items]
    is_authority = kg.has_attr(class_id, "is_authority")

    for rule in kg.rules_for(class_id):
        legal = _legal_note(kg, rule.legal_basis)

        if isinstance(rule, m.RequiresItemRule):
            if not _matching_items(result, rule.item_kind, rule.match_any):
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
                key = text.alnum(fact)
                if not key or key in seen or any(key in c for c in covered):
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
    return out


class KnowledgeRulesCheck:
    """Runs the domain's rules.json for the document's class and all its ancestors."""

    name = "knowledge_rules"

    def run(self, ctx: CheckContext) -> CheckOutput:
        return apply_rules(ctx.result, ctx.knowledge, ctx.document_class.id, ctx.transcript)
