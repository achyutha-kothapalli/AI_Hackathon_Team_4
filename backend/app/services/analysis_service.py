"""Orchestrates one analysis:

    validate uploads -> pick domain -> AI analyzer -> abstain check -> sanitise -> harness

Routes stay thin and analyzers stay focused on the model call; anything that
should apply regardless of which analyzer runs belongs here.
"""

from ..analyzers import AnalysisRequest, Analyzer
from ..core.config import Settings
from ..core.errors import AppError
from ..core.logging import timed
from ..domains import Domain, get_domain
from ..harness import run_harness
from ..schemas.analysis import ImageQuality
from ..schemas.api import AnalyzeResponse
from .sanitize import sanitize
from .uploads import validate_uploads


class AnalysisService:
    def __init__(self, settings: Settings, analyzer: Analyzer):
        self._settings = settings
        self._analyzer = analyzer

    @property
    def analyzer_name(self) -> str:
        return self._analyzer.name

    def domain(self, domain_id: str | None) -> Domain:
        try:
            return get_domain(domain_id or self._settings.default_profile)
        except KeyError as e:
            raise AppError(str(e), 400) from None

    async def analyze(
        self,
        files: list[bytes],
        profile_id: str | None,
        target_language: str,
        sample: str | None = None,
    ) -> AnalyzeResponse:
        pages = validate_uploads(files, self._settings)
        domain = self.domain(profile_id)

        with timed(f"analyzer:{self._analyzer.name}"):
            result = await self._analyzer.analyze(
                AnalysisRequest(pages=pages, domain=domain, target_language=target_language, sample=sample)
            )

        # Abstain rather than guess: an unreadable photo gets no analysis.
        if result.image_quality == ImageQuality.unreadable:
            raise AppError(
                "The photo is too blurry, dark or cropped to read reliably. "
                "Please retake it flat, in good light, with the whole page visible.",
                422,
            )

        result = sanitize(result, len(pages))
        with timed("harness"):
            checks = run_harness(result, domain.knowledge())
        return AnalyzeResponse(
            result=result,
            checks=checks,
            analyzer=self._analyzer.name,
            profile=domain.id,
            page_count=len(pages),
        )
