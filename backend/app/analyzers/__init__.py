from ..config import Settings
from .base import AnalysisRequest, Analyzer, AnalyzerError, PageImage


def create_analyzer(settings: Settings) -> Analyzer:
    """Factory: add new analyzers (OpenAI, Gemini, OCR pipeline, ...) here."""
    if settings.analyzer == "mock":
        from .mock import MockAnalyzer

        return MockAnalyzer()
    if settings.analyzer == "claude":
        from .claude import ClaudeAnalyzer

        return ClaudeAnalyzer(settings)
    raise ValueError(f"Unknown ANALYZER '{settings.analyzer}'")


__all__ = ["AnalysisRequest", "Analyzer", "AnalyzerError", "PageImage", "create_analyzer"]
