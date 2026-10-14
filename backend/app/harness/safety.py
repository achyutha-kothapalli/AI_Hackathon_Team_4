"""Safeguards that don't depend on the document class."""

import re

from ..schemas.analysis import AnalysisResult, Confidence, ImageQuality
from ..schemas.harness import Finding, FindingCategory, Severity
from .rules import _context

# Text in a letter that addresses an AI or tries to steer its output. Real
# official letters never contain this, so any hit is treated as manipulation.
INJECTION_PATTERNS = [
    r"ignor(?:e|iere|ieren sie)\s+(?:all(?:e|en)?\s+|any\s+|die\s+)?(?:previous|prior|above|vorherigen|bisherigen|obigen)\s+(?:instructions|prompts|anweisungen|instruktionen)",
    r"system\s?-?prompt",
    r"\byou are (?:an? )?(?:ai|assistant|language model|chatbot|llm)\b",
    r"\bdu bist (?:eine? )?(?:ki|assistent|sprachmodell|chatbot)\b",
    r"\b(?:to|an|für) (?:the |die |den )?(?:ai|ki|assistant|assistenten|language model|sprachmodell)\b",
    r"(?:mark|classify|label|report)\s+(?:this|the)\s+(?:letter|document)\s+as\s+(?:safe|legitimate|genuine|official)",
    r"(?:do not|don't|never)\s+(?:mention|report|flag|warn)",
    r"(?:nicht|niemals)\s+(?:erwähnen|melden|warnen)",
]


def check_injection(result: AnalysisResult, doc: str) -> list[Finding]:
    findings: list[Finding] = []
    evidence: list[str] = []
    for pattern in INJECTION_PATTERNS:
        match = re.search(pattern, doc, re.IGNORECASE)
        if match:
            evidence.append(_context(doc, match))
    if result.suspicious_instructions:
        evidence.append(result.suspicious_instructions.strip())
    if evidence:
        findings.append(
            Finding(
                rule_id="I-PROMPT-INJECTION",
                category=FindingCategory.injection,
                severity=Severity.critical,
                message="The letter contains text that tries to instruct an AI. It was treated as plain text "
                "and not followed. Genuine letters never do this — treat the letter as suspicious.",
                evidence=" … ".join(dict.fromkeys(evidence)),
            )
        )
    return findings


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
