"""Returns a canned analysis of the bundled sample letter.

Lets the frontend team work without an API key, and keeps tests deterministic.
Set ANALYZER=mock to force it.
"""

from pathlib import Path

from ..schemas.analysis import AnalysisResult
from .base import AnalysisRequest

SAMPLES = Path(__file__).resolve().parent.parent / "fixtures" / "samples"
FIXTURE = SAMPLES / "bussgeldbescheid.json"


class MockAnalyzer:
    name = "mock"

    async def analyze(self, request: AnalysisRequest) -> AnalysisResult:
        fixture = SAMPLES / f"{request.sample}.json" if request.sample else FIXTURE
        if not fixture.is_file() or fixture.parent != SAMPLES:
            fixture = FIXTURE
        result = AnalysisResult.model_validate_json(fixture.read_text(encoding="utf-8"))
        # Only keep content for pages that were actually uploaded.
        n = len(request.pages)
        result.blocks = [b for b in result.blocks if b.page < n]
        result.key_items = [k for k in result.key_items if k.page < n]
        result.target_language = request.target_language
        return result
