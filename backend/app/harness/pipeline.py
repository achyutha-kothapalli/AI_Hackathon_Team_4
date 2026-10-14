"""Runs the harness checks and assembles the HarnessReport."""

from collections.abc import Sequence

from ..knowledge import KnowledgeGraph
from ..schemas.analysis import AnalysisResult
from ..schemas.harness import CheckSummary, Escalation, FindingCategory, HarnessReport, Severity
from .base import Check, CheckContext, CheckOutput, transcript
from .checks import DEFAULT_CHECKS

_ORDER = {Severity.critical: 0, Severity.warning: 1, Severity.info: 2}


def run_harness(
    result: AnalysisResult, kg: KnowledgeGraph, checks: Sequence[Check] = DEFAULT_CHECKS
) -> HarnessReport:
    doc = transcript(result)
    ctx = CheckContext(
        result=result,
        knowledge=kg,
        document_class=kg.classify(doc, result.document_class),
        transcript=doc,
    )

    out = CheckOutput()
    for check in checks:
        out.merge(check.run(ctx))
    out.findings.sort(key=lambda f: _ORDER[f.severity])  # stable: keeps check order within a severity

    scam_suspected = any(
        f.severity == Severity.critical and f.category in (FindingCategory.scam, FindingCategory.injection)
        for f in out.findings
    )
    if scam_suspected:
        out.escalation_reasons.insert(
            0, "This letter shows signs of fraud. Do not pay or reply before verifying it."
        )
        out.add_resources(kg, ["verbraucherzentrale", "police"])

    escalation = (
        Escalation(reason=" ".join(dict.fromkeys(out.escalation_reasons)), resources=out.resources)
        if out.escalation_reasons
        else None
    )
    return HarnessReport(
        document_class=ctx.document_class,
        findings=out.findings,
        item_checks=out.item_checks,
        escalation=escalation,
        scam_suspected=scam_suspected,
        summary=CheckSummary(
            total_items=len(result.key_items),
            grounded_items=sum(1 for c in out.item_checks.values() if c.grounded),
            critical=sum(1 for f in out.findings if f.severity == Severity.critical),
            warnings=sum(1 for f in out.findings if f.severity == Severity.warning),
            infos=sum(1 for f in out.findings if f.severity == Severity.info),
        ),
    )
