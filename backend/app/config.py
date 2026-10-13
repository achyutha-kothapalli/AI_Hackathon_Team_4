"""Runtime settings, read from environment variables (see .env.example)."""

import os
from dataclasses import dataclass, field
from functools import lru_cache


def _env(name: str, default: str) -> str:
    # Empty values (e.g. "ANALYZER=" copied from .env.example) mean "use the default".
    return os.environ.get(name, "").strip() or default


@dataclass(frozen=True)
class Settings:
    # "claude" or "mock". Defaults to mock when no API key is present so the
    # app is usable out of the box for frontend work.
    analyzer: str = field(
        default_factory=lambda: _env(
            "ANALYZER", "claude" if os.environ.get("ANTHROPIC_API_KEY") else "mock"
        )
    )
    claude_model: str = field(default_factory=lambda: _env("CLAUDE_MODEL", "claude-opus-5-5"))
    claude_effort: str = field(default_factory=lambda: _env("CLAUDE_EFFORT", "medium"))
    default_profile: str = field(default_factory=lambda: _env("DEFAULT_PROFILE", "german_letter"))
    max_pages: int = field(default_factory=lambda: int(_env("MAX_PAGES", "6")))
    # Vercel rejects request bodies above 4.5 MB, so the frontend compresses
    # images before upload; this is the server-side guard.
    max_total_upload_bytes: int = field(
        default_factory=lambda: int(_env("MAX_TOTAL_UPLOAD_BYTES", str(4_400_000)))
    )
    cors_origins: tuple[str, ...] = field(
        default_factory=lambda: tuple(
            o for o in _env("CORS_ORIGINS", "http://localhost:5173").split(",") if o
        )
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
