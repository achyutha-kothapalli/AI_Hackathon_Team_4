"""The contract every harness check implements.

A check receives a read-only `CheckContext` and returns a `CheckOutput`. Checks
never modify the AI's answer and never depend on each other, so they can be
developed, tested and owned independently. Register a new check in
`checks/__init__.py` (DEFAULT_CHECKS).
"""

from dataclasses import dataclass, field
from typing import Protocol

from ..knowledge import KnowledgeGraph
from ..schemas.analysis import AnalysisResult
from ..schemas.harness import DocumentClassInfo, Finding, ItemCheck, Readability, Resource


@dataclass(frozen=True)
class CheckContext:
    result: AnalysisResult  # the AI's answer (do not modify)
    knowledge: KnowledgeGraph  # the domain's ontology + rules
    document_class: DocumentClassInfo  # where the letter sits in the ontology
    transcript: str  # the letter's full text as transcribed by the AI


@dataclass
class CheckOutput:
    findings: list[Finding] = field(default_factory=list)
    item_checks: dict[str, ItemCheck] = field(default_factory=dict)
    escalation_reasons: list[str] = field(default_factory=list)
    resources: list[Resource] = field(default_factory=list)
    readability: Readability | None = None

    def add_resources(self, kg: KnowledgeGraph, ids: list[str]) -> None:
        """Append help resources from the knowledge graph, without duplicates."""
        for rid in ids:
            r = kg.resource(rid)
            if all(x.id != r.id for x in self.resources):
                self.resources.append(Resource(id=r.id, label=r.label, url=r.url, description=r.description))

    def merge(self, other: "CheckOutput") -> None:
        self.findings += other.findings
        self.item_checks.update(other.item_checks)
        self.escalation_reasons += other.escalation_reasons
        self.readability = other.readability or self.readability
        for r in other.resources:
            if all(x.id != r.id for x in self.resources):
                self.resources.append(r)


class Check(Protocol):
    name: str

    def run(self, ctx: CheckContext) -> CheckOutput: ...


def transcript(result: AnalysisResult) -> str:
    """The letter's text as transcribed by the AI, block by block."""
    return "\n".join(b.original for b in result.blocks)
