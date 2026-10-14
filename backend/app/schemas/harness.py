"""What the accuracy & safety harness reports alongside every analysis.

These fields are computed by code (app/harness), never by the AI model, so they
are not part of the schema sent to the model. Mirrored in frontend/src/api/types.ts.
"""

from enum import Enum

from pydantic import BaseModel, Field


class Severity(str, Enum):
    info = "info"  # worth knowing, no action needed
    warning = "warning"  # check this against the letter
    critical = "critical"  # do not act before verifying (possible scam, invented fact)


class FindingCategory(str, Enum):
    grounding = "grounding"  # "nothing invented": fact not traceable to the letter
    completeness = "completeness"  # "nothing lost": expected fact missing / not extracted
    legal = "legal"  # consistency with the legal rules in the knowledge graph
    scam = "scam"  # signs of a fraudulent letter
    injection = "injection"  # text in the letter tried to instruct the AI
    quality = "quality"  # photo or reading quality
    escalation = "escalation"  # high-stakes letter: get human help


class Finding(BaseModel):
    rule_id: str = Field(description="Id of the rule (knowledge graph) or built-in check that fired.")
    category: FindingCategory
    severity: Severity
    message: str
    item_ids: list[str] = []
    evidence: str | None = Field(default=None, description="Text from the letter that triggered the finding.")
    legal_basis: str | None = None


class ItemCheck(BaseModel):
    item_id: str
    grounded: bool = Field(description="Every number/date/amount of the item was found in its quote and the quote in the letter text.")
    issues: list[str] = []


class Resource(BaseModel):
    id: str
    label: str
    url: str | None = None
    description: str


class Escalation(BaseModel):
    reason: str
    resources: list[Resource]


class DocumentClassInfo(BaseModel):
    id: str
    label: str
    lineage: list[str] = Field(description="Ontology ancestors, most specific first.")
    source: str = Field(description="'model', 'keywords' or 'unknown'.")


class CheckSummary(BaseModel):
    total_items: int
    grounded_items: int
    critical: int
    warnings: int
    infos: int


class HarnessReport(BaseModel):
    document_class: DocumentClassInfo
    findings: list[Finding]
    item_checks: dict[str, ItemCheck]
    escalation: Escalation | None
    scam_suspected: bool
    summary: CheckSummary
