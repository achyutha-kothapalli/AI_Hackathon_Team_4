"""Harness checks. Order matters only for how findings of equal severity are listed.

To add a check: create a module with a class that has `name` and
`run(ctx: CheckContext) -> CheckOutput`, then add an instance below.
"""

from .grounding import GroundingCheck
from .injection import InjectionCheck
from .knowledge_rules import KnowledgeRulesCheck
from .quality import QualityCheck

DEFAULT_CHECKS = (GroundingCheck(), KnowledgeRulesCheck(), InjectionCheck(), QualityCheck())

__all__ = ["DEFAULT_CHECKS", "GroundingCheck", "InjectionCheck", "KnowledgeRulesCheck", "QualityCheck"]
