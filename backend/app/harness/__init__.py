"""Accuracy & safety harness, run on every analysis after the AI call.

    classify   -> map the letter onto the knowledge-graph ontology
    grounding  -> "nothing invented": every fact traceable to the letter text
    rules      -> "nothing lost" + legal consistency + scam signs + escalation (from the knowledge graph)
    safety     -> prompt-injection and reading-quality safeguards

The harness never edits the AI's answer; it reports findings so the UI can
warn the user. It is analyzer-independent (Claude, TrustedTokens, mock).
"""

from ..knowledge import KnowledgeGraph
from ..schemas.analysis import AnalysisResult
from ..schemas.harness import (
    CheckSummary,
    Escalation,
    FindingCategory,
    HarnessReport,
    Severity,
)
from .grounding import check_grounding, transcript
from .rules import apply_rules
from .safety import check_injection, check_quality

_ORDER = {Severity.critical: 0, Severity.warning: 1, Severity.info: 2}


def run_harness(result: AnalysisResult, kg: KnowledgeGraph) -> HarnessReport:
    doc = transcript(result)
    doc_class = kg.classify(doc, result.document_class)

    item_checks, findings = check_grounding(result)
    outcome = apply_rules(result, kg, doc_class.id, doc)
    findings += outcome.findings
    findings += check_injection(result, doc)
    findings += check_quality(result)
    findings.sort(key=lambda f: _ORDER[f.severity])

    scam_suspected = any(
        f.severity == Severity.critical and f.category in (FindingCategory.scam, FindingCategory.injection)
        for f in findings
    )
    if scam_suspected:
        outcome.escalation_reasons.insert(0, "This letter shows signs of fraud. Do not pay or reply before verifying it.")
        outcome.add_resources(kg, ["verbraucherzentrale", "police"])

    escalation = (
        Escalation(reason=" ".join(dict.fromkeys(outcome.escalation_reasons)), resources=outcome.resources)
        if outcome.escalation_reasons
        else None
    )
    return HarnessReport(
        document_class=doc_class,
        findings=findings,
        item_checks=item_checks,
        escalation=escalation,
        scam_suspected=scam_suspected,
        summary=CheckSummary(
            total_items=len(result.key_items),
            grounded_items=sum(1 for c in item_checks.values() if c.grounded),
            critical=sum(1 for f in findings if f.severity == Severity.critical),
            warnings=sum(1 for f in findings if f.severity == Severity.warning),
            infos=sum(1 for f in findings if f.severity == Severity.info),
        ),
    )


__all__ = ["run_harness"]
