"""Analyzer backed by Claude's vision + structured outputs."""

import base64
import logging

import anthropic
from pydantic import ValidationError

from ..core.config import Settings
from ..schemas.analysis import AnalysisResult
from .base import AnalysisRequest, AnalyzerError, ProcessingInfo
from .prompts import build_system_prompt

log = logging.getLogger(__name__)

# If Claude declines a request, the API re-runs it on a recommended fallback
# model instead of returning a refusal.
_FALLBACK_BETA = "server-side-fallback-2026-07-01"

# Structured outputs guarantee the reply matches the Pydantic schema.
_SCHEMA = anthropic.transform_schema(AnalysisResult)


class ClaudeAnalyzer:
    name = "claude"
    processing = ProcessingInfo(provider="Anthropic (Claude API)", region="USA", eu=False)

    def __init__(self, settings: Settings):
        self._model = settings.claude_model
        self._effort = settings.claude_effort
        self._client = anthropic.AsyncAnthropic(max_retries=1, timeout=240)

    async def analyze(self, request: AnalysisRequest) -> AnalysisResult:
        content: list[dict] = []
        for i, page in enumerate(request.pages):
            content.append({"type": "text", "text": f"Page {i}:"})
            content.append(
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": page.media_type,
                        "data": base64.standard_b64encode(page.data).decode("ascii"),
                    },
                }
            )
        content.append(
            {
                "type": "text",
                "text": f"Analyse this {len(request.pages)}-page document. "
                f"Target language: {request.target_language}.",
            }
        )

        try:
            # Streamed because long multi-page translations need a large
            # max_tokens; the result is only used once complete.
            async with self._client.messages.stream(
                model=self._model,
                max_tokens=32000,
                system=build_system_prompt(request.domain, request.target_language),
                messages=[{"role": "user", "content": content}],
                output_config={
                    "effort": self._effort,
                    "format": {"type": "json_schema", "schema": _SCHEMA},
                },
                extra_headers={"anthropic-beta": _FALLBACK_BETA},
                extra_body={"fallbacks": "default"},
            ) as stream:
                response = await stream.get_final_message()
        except anthropic.AuthenticationError:
            raise AnalyzerError("Server is missing a valid ANTHROPIC_API_KEY.", 500) from None
        except anthropic.RateLimitError:
            raise AnalyzerError("Too many requests right now. Try again in a minute.", 429) from None
        except anthropic.BadRequestError as e:
            log.warning("Claude rejected request: %s", e.message)
            raise AnalyzerError(f"The document could not be processed: {e.message}", 400) from None
        except anthropic.APIStatusError as e:
            log.error("Claude API error %s: %s", e.status_code, e.message)
            raise AnalyzerError("The AI service had an error. Please retry.", 502) from None
        except anthropic.APIConnectionError:
            raise AnalyzerError("Could not reach the AI service. Please retry.", 504) from None

        log.info("claude message=%s stop=%s usage=%s", response.id, response.stop_reason, response.usage)

        if response.stop_reason == "refusal":
            raise AnalyzerError("The AI declined to analyse this document.", 422)
        if response.stop_reason == "max_tokens":
            raise AnalyzerError("The document is too long to analyse in one go. Try fewer pages.", 413)
        text = next((b.text for b in response.content if b.type == "text"), "")
        try:
            return AnalysisResult.model_validate_json(text)
        except ValidationError:
            log.exception("Claude output failed validation")
            raise AnalyzerError("The AI returned an unreadable answer. Please retry.", 502) from None
