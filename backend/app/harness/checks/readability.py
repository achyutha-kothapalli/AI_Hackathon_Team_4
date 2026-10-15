"""Health-literacy safeguard: is the AI's explanation easy enough to read?

Scores the text the AI wrote for the reader (summary, steps, explanations,
medication notes) with Flesch Reading Ease (English) or the Amstad formula
(German, also used for "Einfache Sprache"). 0-100, higher is easier; plain
language for low literacy aims at roughly 60-70 or more.

Enabled per domain with `settings.readability_target` in ontology.json. Other
target languages are not scored (no validated formula here).
"""

import re

from ...schemas.harness import Finding, FindingCategory, Readability, Severity
from .. import text
from ..base import CheckContext, CheckOutput

_LEVELS = [
    (90, "very easy"),
    (80, "easy"),
    (70, "fairly easy"),
    (60, "standard"),
    (50, "fairly difficult"),
    (30, "difficult"),
    (0, "very difficult"),
]


def _language(target_language: str) -> str | None:
    t = target_language.lower()
    if "english" in t:
        return "en"
    if any(k in t for k in ("german", "deutsch", "einfache sprache", "leichte sprache")):
        return "de"
    return None


def _syllables(word: str, lang: str) -> int:
    w = word.lower()
    if lang == "en" and len(w) > 2 and w.endswith("e") and not w.endswith(("le", "ee")):
        w = w[:-1]
    groups = re.findall(r"[aeiouyäöü]+", w)
    return max(1, len(groups))


def score_text(body: str, lang: str) -> tuple[float, float] | None:
    """(score 0-100, average words per sentence), or None if there is too little text."""
    sentences = [s for s in re.split(r"[.!?;:\n]+", body) if re.search(r"[^\W\d_]", s)]
    words = re.findall(r"[^\W\d_]+(?:-[^\W\d_]+)*", body)
    if len(words) < 20 or not sentences:
        return None
    asl = len(words) / len(sentences)
    asw = sum(_syllables(w, lang) for w in words) / len(words)
    raw = 206.835 - 1.015 * asl - 84.6 * asw if lang == "en" else 180 - asl - 58.5 * asw
    return max(0.0, min(100.0, raw)), asl


def level(score: float) -> str:
    return next(name for threshold, name in _LEVELS if score >= threshold)


class ReadabilityCheck:
    name = "readability"

    def run(self, ctx: CheckContext) -> CheckOutput:
        target = ctx.knowledge.settings.readability_target
        lang = _language(ctx.result.target_language)
        if target is None or lang is None:
            return CheckOutput()
        scored = score_text(text.generated_text(ctx.result), lang)
        if scored is None:
            return CheckOutput()
        score, asl = scored
        out = CheckOutput(
            readability=Readability(
                score=round(score, 1),
                level=level(score),
                target=target,
                avg_sentence_words=round(asl, 1),
                language=lang,
            )
        )
        if score < target:
            out.findings.append(
                Finding(
                    rule_id="R-READABILITY",
                    category=FindingCategory.readability,
                    severity=Severity.warning,
                    message=f"The explanation may be hard to read (readability {score:.0f}, "
                    f"target {target:.0f}; {asl:.0f} words per sentence). Ask for help if anything is unclear.",
                )
            )
        return out
