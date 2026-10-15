"""Upload validation: limits, file types (by magic bytes, not file name)."""

from ..analyzers import PageImage
from ..core.config import Settings
from ..core.errors import AppError

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


def validate_uploads(files: list[bytes], settings: Settings) -> list[PageImage]:
    if not files:
        raise AppError("Upload at least one page.", 400)
    if len(files) > settings.max_pages:
        raise AppError(f"At most {settings.max_pages} pages per document.", 400)
    if sum(len(f) for f in files) > settings.max_total_upload_bytes:
        raise AppError("Upload is too large. Use smaller or fewer images.", 413)

    pages: list[PageImage] = []
    for i, data in enumerate(files):
        media_type = sniff_image_type(data)
        if media_type is None:
            raise AppError(f"Page {i + 1} is not a JPEG, PNG, WebP or GIF image.", 415)
        pages.append(PageImage(data=data, media_type=media_type))
    return pages
