"""HTTP response models (what the frontend receives). Mirrored in frontend/src/api/types.ts."""

from pydantic import BaseModel

from .analysis import AnalysisResult
from .harness import HarnessReport


class AnalyzeResponse(BaseModel):
    """POST /api/analyze"""

    result: AnalysisResult  # produced by the AI model
    checks: HarnessReport  # produced by the accuracy & safety harness (code)
    analyzer: str
    profile: str
    page_count: int


class SampleInfo(BaseModel):
    id: str
    label: str
    image: str


class DomainUIInfo(BaseModel):
    headline: str
    intro: str
    upload_title: str
    upload_hint: str
    disclaimer: str
    progress: list[str]


class ProfileInfo(BaseModel):
    """A domain pack, as the UI sees it (called "profile" in the API)."""

    id: str
    name: str
    description: str
    source_language: str
    ocr_language: str
    ui: DomainUIInfo
    samples: list[SampleInfo]


class MetaResponse(BaseModel):
    """GET /api/meta: everything the UI needs to configure itself."""

    version: str
    analyzer: str
    default_profile: str
    profiles: list[ProfileInfo]
    languages: list[str]
    max_pages: int
    max_total_upload_bytes: int
