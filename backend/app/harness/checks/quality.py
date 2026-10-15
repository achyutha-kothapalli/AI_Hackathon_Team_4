"""Reading-quality safeguards: poor photos, low-confidence facts, model notes.

(Unreadable photos are refused earlier, in the analysis service.)
"""

from ...schemas.analysis import AnalysisResult, Confidence, ImageQuality
from ...schemas.harness import Finding, FindingCategory, Severity
from ..base import CheckContext, CheckOutput


def check_quality(result: AnalysisResult) -> list[Finding]:
    findings: list[Finding] = []
    if result.image_quality == ImageQuality.poor:
        findings.append(
            Finding(
                rule_id="Q-POOR-IMAGE",
                category=FindingCategory.quality,
                severity=Severity.warning,
                message="The photo was hard to read. Compare every highlighted detail with the letter, "
                "or retake the photo flat and in good light.",
            )
        )
    for item in result.key_items:
        if item.confidence == Confidence.low:
            findings.append(
                Finding(
                    rule_id="Q-LOW-CONFIDENCE",
                    category=FindingCategory.quality,
                    severity=Severity.warning,
                    message=f"“{item.label}” could not be read with certainty. Check it on the letter.",
                    item_ids=[item.id],
                    evidence=item.source_quote or None,
                )
            )
    if result.confidence_note:
        findings.append(
            Finding(
                rule_id="Q-MODEL-NOTE",
                category=FindingCategory.quality,
                severity=Severity.info,
                message=result.confidence_note,
            )
        )
    return findings


class QualityCheck:
    name = "quality"

    def run(self, ctx: CheckContext) -> CheckOutput:
        return CheckOutput(findings=check_quality(ctx.result))
