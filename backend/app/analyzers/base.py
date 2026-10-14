"""Analyzer interface. An analyzer turns page images into an AnalysisResult."""

from dataclasses import dataclass
from typing import Protocol

from ..profiles import Profile
from ..schemas.analysis import AnalysisResult


@dataclass(frozen=True)
class PageImage:
    data: bytes
    media_type: str  # image/jpeg, image/png, image/webp or image/gif


@dataclass(frozen=True)
class AnalysisRequest:
    pages: list[PageImage]
    profile: Profile
    target_language: str
    # Name of a bundled sample letter, sent by the UI's "Try a sample" buttons.
    # Only the mock analyzer uses it; real analyzers ignore it.
    sample: str | None = None


class AnalyzerError(Exception):
    """Raised for failures the user should see. status_code maps to HTTP."""

    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class Analyzer(Protocol):
    name: str

    async def analyze(self, request: AnalysisRequest) -> AnalysisResult: ...
