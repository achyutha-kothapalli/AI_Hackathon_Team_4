"""Returns a prepared answer from the domain pack's samples/ folder.

Lets the team work without an API key, makes demos free, and keeps tests
deterministic. Used when no API key is configured, or with ANALYZER=mock.
The UI's "Try a sample" buttons send the sample id; any other upload gets the
domain's first sample.
"""

from ..schemas.analysis import AnalysisResult
from .base import AnalysisRequest, AnalyzerError


class MockAnalyzer:
    name = "mock"

    async def analyze(self, request: AnalysisRequest) -> AnalysisResult:
        domain = request.domain
        path = domain.sample_answer(request.sample)
        if path is None and domain.samples:
            path = domain.sample_answer(domain.samples[0].id)
        if path is None:
            raise AnalyzerError(f"Domain '{domain.id}' has no sample answers for demo mode.", 501)
        result = AnalysisResult.model_validate_json(path.read_text(encoding="utf-8"))
        # Only keep content for pages that were actually uploaded.
        n = len(request.pages)
        result.blocks = [b for b in result.blocks if b.page < n]
        result.key_items = [k for k in result.key_items if k.page < n]
        result.target_language = request.target_language
        return result
