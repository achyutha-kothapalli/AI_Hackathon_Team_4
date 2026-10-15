"""Analyzer interface. An analyzer turns page images into an AnalysisResult."""

from dataclasses import dataclass
from typing import Protocol

from ..core.errors import AppError
from ..domains import Domain
from ..schemas.analysis import AnalysisResult


@dataclass(frozen=True)
class ProcessingInfo:
    """Who processes uploaded documents and where (GDPR transparency, Art. 13)."""

    provider: str
    region: str
    eu: bool


@dataclass(frozen=True)
class PageImage:
    data: bytes
    media_type: str  # image/jpeg, image/png, image/webp or image/gif


@dataclass(frozen=True)
class AnalysisRequest:
    pages: list[PageImage]
    domain: Domain
    target_language: str
    # Name of a bundled sample letter, sent by the UI's "Try a sample" buttons.
    # Only the mock analyzer uses it; real analyzers ignore it.
    sample: str | None = None


class AnalyzerError(AppError):
    """An AI-provider failure the user should see (defaults to 502 Bad Gateway)."""

    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message, status_code)


class Analyzer(Protocol):
    name: str
    processing: ProcessingInfo

    async def analyze(self, request: AnalysisRequest) -> AnalysisResult: ...
