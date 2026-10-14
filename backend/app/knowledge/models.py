"""Pydantic models for the knowledge JSON files. Loading validates the files, so a
typo in a rule fails loudly at startup (and in tests) instead of silently."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from ..schemas.analysis import KeyItemKind
from ..schemas.harness import FindingCategory, Severity


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class DocClass(_Strict):
    id: str
    label: str
    parents: list[str]
    keywords: list[str] = []
    attrs: dict[str, bool | str | int] = {}


class LegalBasis(_Strict):
    id: str
    label: str
    text: str
    period_days: int | None = None


class ItemKindDef(_Strict):
    id: KeyItemKind
    label: str


class ResourceDef(_Strict):
    id: str
    label: str
    url: str | None
    description: str


class Ontology(_Strict):
    comment: str | None = Field(default=None, alias="$comment")
    version: str
    root: str
    classes: list[DocClass]
    legal_bases: list[LegalBasis]
    item_kinds: list[ItemKindDef]
    resources: list[ResourceDef]


class _RuleBase(_Strict):
    id: str
    applies_to: str
    legal_basis: str | None = None


class RequiresItemRule(_RuleBase):
    """'Nothing lost': a letter of this class must yield an item of this kind."""

    type: Literal["requires_item"]
    item_kind: KeyItemKind
    match_any: list[str] = []
    severity: Severity
    message: str


class SignalCoverageRule(_RuleBase):
    """'Nothing lost': every fact matching `pattern` in the letter must be covered by an item."""

    type: Literal["signal_coverage"]
    item_kind: KeyItemKind
    pattern: str
    severity: Severity
    message: str


class ExpectedPeriodRule(_RuleBase):
    """Legal consistency: the extracted objection period should match the statutory one."""

    type: Literal["expected_period"]
    match_any: list[str]
    period_phrases: list[str]
    severity: Severity
    message: str


class TextPatternRule(_RuleBase):
    type: Literal["text_pattern"]
    category: FindingCategory
    pattern: str
    severity: Severity
    message: str


class ForeignIbanRule(_RuleBase):
    type: Literal["foreign_iban"]
    category: FindingCategory
    severity: Severity
    message: str


class IbanChecksumRule(_RuleBase):
    type: Literal["iban_checksum"]
    category: FindingCategory
    severity: Severity
    message: str


class EscalateRule(_RuleBase):
    type: Literal["escalate"]
    reason: str
    resources: list[str]


class EscalateOnPatternRule(_RuleBase):
    type: Literal["escalate_on_pattern"]
    pattern: str
    reason: str
    resources: list[str]


Rule = Annotated[
    RequiresItemRule
    | SignalCoverageRule
    | ExpectedPeriodRule
    | TextPatternRule
    | ForeignIbanRule
    | IbanChecksumRule
    | EscalateRule
    | EscalateOnPatternRule,
    Field(discriminator="type"),
]


class RuleSet(_Strict):
    comment: str | None = Field(default=None, alias="$comment")
    version: str
    rules: list[Rule]
