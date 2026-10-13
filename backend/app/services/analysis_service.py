"""Orchestrates one analysis: validate input -> run analyzer -> clean output.

Routes stay thin and analyzers stay focused on the model call; anything that
should apply regardless of which analyzer runs belongs here.
"""

from ..analyzers import AnalysisRequest, Analyzer, AnalyzerError, PageImage
from ..config import Settings
from ..profiles import get_profile
from ..schemas.analysis import AnalysisResult, AnalyzeResponse, BBox

SUPPORTED_LANGUAGES = [
    "English",
    "Arabic",
    "Turkish",
    "Ukrainian",
    "Russian",
    "Spanish",
    "French",
    "Hindi",
    "Telugu",
    "Persian",
    "Polish",
    "Simplified Chinese",
]

_MAGIC = [
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"GIF8", "image/gif"),
]


def sniff_image_type(data: bytes) -> str | None:
    for magic, media_type in _MAGIC:
        if data.startswith(magic):
            return media_type
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def _clamp_bbox(b: BBox) -> BBox:
    x0, x1 = sorted((max(0, min(1000, b.x0)), max(0, min(1000, b.x1))))
    y0, y1 = sorted((max(0, min(1000, b.y0)), max(0, min(1000, b.y1))))
    return BBox(x0=x0, y0=y0, x1=max(x1, x0 + 1), y1=max(y1, y0 + 1))


def _sanitize(result: AnalysisResult, page_count: int) -> AnalysisResult:
    last = page_count - 1
    for item in [*result.blocks, *result.key_items]:
        item.page = max(0, min(last, item.page))
        item.bbox = _clamp_bbox(item.bbox)
    return result


class AnalysisService:
    def __init__(self, settings: Settings, analyzer: Analyzer):
        self._settings = settings
        self._analyzer = analyzer

    @property
    def analyzer_name(self) -> str:
        return self._analyzer.name

    async def analyze(
        self, files: list[bytes], profile_id: str | None, target_language: str
    ) -> AnalyzeResponse:
        if not files:
            raise AnalyzerError("Upload at least one page.", 400)
        if len(files) > self._settings.max_pages:
            raise AnalyzerError(f"At most {self._settings.max_pages} pages per document.", 400)
        if sum(len(f) for f in files) > self._settings.max_total_upload_bytes:
            raise AnalyzerError("Upload is too large. Use smaller or fewer images.", 413)

        pages: list[PageImage] = []
        for i, data in enumerate(files):
            media_type = sniff_image_type(data)
            if media_type is None:
                raise AnalyzerError(
                    f"Page {i + 1} is not a JPEG, PNG, WebP or GIF image.", 415
                )
            pages.append(PageImage(data=data, media_type=media_type))

        try:
            profile = get_profile(profile_id or self._settings.default_profile)
        except KeyError as e:
            raise AnalyzerError(str(e), 400) from None

        result = await self._analyzer.analyze(
            AnalysisRequest(pages=pages, profile=profile, target_language=target_language)
        )
        return AnalyzeResponse(
            result=_sanitize(result, len(pages)),
            analyzer=self._analyzer.name,
            profile=profile.id,
            page_count=len(pages),
        )
