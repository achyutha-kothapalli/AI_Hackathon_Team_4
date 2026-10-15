"""Runtime settings, read from environment variables (see .env.example)."""

import os
from dataclasses import dataclass, field
from functools import lru_cache

APP_NAME = "BriefVerstehen"
APP_VERSION = "0.2.0"


def _env(name: str, default: str) -> str:
    # Empty values (e.g. "ANALYZER=" copied from .env.example) mean "use the default".
    return os.environ.get(name, "").strip() or default


def _default_analyzer() -> str:
    # Pick whichever provider has a key; mock otherwise, so the app is usable
    # out of the box for frontend work.
    if _env("ANTHROPIC_API_KEY", ""):
        return "claude"
    if _env("TRUSTEDTOKENS_API_KEY", ""):
        return "trustedtokens"
    return "mock"


@dataclass(frozen=True)
class Settings:
    # "claude", "trustedtokens" or "mock".
    analyzer: str = field(default_factory=lambda: _env("ANALYZER", _default_analyzer()))
    claude_model: str = field(default_factory=lambda: _env("CLAUDE_MODEL", "claude-opus-5-5"))
    claude_effort: str = field(default_factory=lambda: _env("CLAUDE_EFFORT", "medium"))
    trustedtokens_api_key: str = field(default_factory=lambda: _env("TRUSTEDTOKENS_API_KEY", ""))
    trustedtokens_base_url: str = field(
        default_factory=lambda: _env("TRUSTEDTOKENS_BASE_URL", "https://api.trustedtokens.eu/v1")
    )
    # Must be a vision-capable model id from GET /v1/models.
    trustedtokens_model: str = field(default_factory=lambda: _env("TRUSTEDTOKENS_MODEL", "Qwen/Qwen3.8-27B"))
    # Domain pack used when the client sends none (see app/domains/).
    default_profile: str = field(default_factory=lambda: _env("DEFAULT_PROFILE", "medical_document"))
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
