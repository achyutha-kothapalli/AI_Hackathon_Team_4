"""Defensive clean-up of the AI's answer before anything else uses it.

A slightly wrong coordinate or page index from the model must never break the UI.
"""

from ..schemas.analysis import AnalysisResult, BBox


def _clamp_bbox(b: BBox) -> BBox:
    x0, x1 = sorted((max(0, min(1000, b.x0)), max(0, min(1000, b.x1))))
    y0, y1 = sorted((max(0, min(1000, b.y0)), max(0, min(1000, b.y1))))
    return BBox(x0=x0, y0=y0, x1=max(x1, x0 + 1), y1=max(y1, y0 + 1))


def sanitize(result: AnalysisResult, page_count: int) -> AnalysisResult:
    """Clamp page indices to existing pages and boxes into 0..1000 with ordered corners."""
    last = page_count - 1
    for item in [*result.blocks, *result.key_items]:
        item.page = max(0, min(last, item.page))
        item.bbox = _clamp_bbox(item.bbox)
    return result
