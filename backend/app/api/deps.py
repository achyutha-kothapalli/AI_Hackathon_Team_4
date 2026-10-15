"""FastAPI dependencies: one AnalysisService per process, built from settings."""

from functools import lru_cache

from ..analyzers import create_analyzer
from ..core.config import get_settings
from ..services.analysis_service import AnalysisService


@lru_cache
def get_service() -> AnalysisService:
    settings = get_settings()
    return AnalysisService(settings, create_analyzer(settings))
