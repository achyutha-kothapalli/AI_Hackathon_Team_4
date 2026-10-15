"""Accuracy & safety harness, run on every analysis after the AI call.

    pipeline.py             classify the document, run each check, assemble the report
    base.py                 the Check contract (CheckContext -> CheckOutput)
    checks/grounding.py     "nothing invented": every fact traceable to the letter text
    checks/knowledge_rules.py  knowledge-graph rules: "nothing lost", legal, scam, escalation
    checks/injection.py     prompt-injection safeguard
    checks/quality.py       reading-quality and low-confidence safeguards
    checks/readability.py   health literacy: is the explanation easy to read?
    text.py                 deterministic text helpers (numbers, dates, amounts, IBANs)

The harness never edits the AI's answer; it reports findings so the UI can
warn the user. It is analyzer-independent (Claude, TrustedTokens, mock).
"""

from .base import Check, CheckContext, CheckOutput
from .checks import DEFAULT_CHECKS
from .pipeline import run_harness

__all__ = ["DEFAULT_CHECKS", "Check", "CheckContext", "CheckOutput", "run_harness"]
