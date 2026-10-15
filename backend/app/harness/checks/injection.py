"""Prompt-injection safeguard.

The prompt tells the model to treat the letter as data and report AI-directed
text in `suspicious_instructions`. This check additionally scans the letter
text itself, so injection is caught even if the model obeyed it.
"""

import re

from ...schemas.analysis import AnalysisResult
from ...schemas.harness import Finding, FindingCategory, Severity
from .. import text
from ..base import CheckContext, CheckOutput

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
            evidence.append(text.context(doc, match))
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


class InjectionCheck:
    name = "injection"

    def run(self, ctx: CheckContext) -> CheckOutput:
        return CheckOutput(findings=check_injection(ctx.result, ctx.transcript))
