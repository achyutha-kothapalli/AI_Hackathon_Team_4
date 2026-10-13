"""Analyzer backed by TrustedTokens (https://trustedtokens.eu): EU-hosted open-source
models behind an OpenAI-compatible API. Data is processed in Germany.

The chosen model must accept images (vision). Check the catalog with
GET https://api.trustedtokens.eu/v1/models and set TRUSTEDTOKENS_MODEL.
"""

import base64
import json
import logging
import re

import openai
from openai.lib._pydantic import to_strict_json_schema
from pydantic import ValidationError

from ..config import Settings
from ..schemas.analysis import AnalysisResult
from .base import AnalysisRequest, AnalyzerError
from .prompts import build_system_prompt

log = logging.getLogger(__name__)

_SCHEMA = to_strict_json_schema(AnalysisResult)

_JSON_MODE_INSTRUCTIONS = (
    "\n\nRespond with a single JSON object and nothing else (no markdown, no prose). "
    "It must validate against this JSON Schema:\n" + json.dumps(_SCHEMA)
)

_FENCE = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$", re.IGNORECASE)


def _parse(text: str) -> AnalysisResult:
    """Validate model output; tolerate markdown fences some models add."""
    return AnalysisResult.model_validate_json(_FENCE.sub("", text or ""))


def _schema_unsupported(e: openai.BadRequestError) -> bool:
    msg = str(e.message).lower()
    return any(w in msg for w in ("response_format", "json_schema", "structured", "guided"))


class TrustedTokensAnalyzer:
    name = "trustedtokens"

    def __init__(self, settings: Settings):
        if not settings.trustedtokens_api_key:
            raise ValueError("ANALYZER=trustedtokens requires TRUSTEDTOKENS_API_KEY")
        self._model = settings.trustedtokens_model
        self._client = openai.AsyncOpenAI(
            base_url=settings.trustedtokens_base_url,
            api_key=settings.trustedtokens_api_key,
            max_retries=1,
            timeout=240,
        )

    def _messages(self, request: AnalysisRequest, json_mode: bool) -> list[dict]:
        system = build_system_prompt(request.profile, request.target_language)
        if json_mode:
            system += _JSON_MODE_INSTRUCTIONS
        content: list[dict] = []
        for i, page in enumerate(request.pages):
            data = base64.standard_b64encode(page.data).decode("ascii")
            content.append({"type": "text", "text": f"Page {i}:"})
            content.append(
                {"type": "image_url", "image_url": {"url": f"data:{page.media_type};base64,{data}"}}
            )
        content.append(
            {
                "type": "text",
                "text": f"Analyse this {len(request.pages)}-page document. "
                f"Target language: {request.target_language}.",
            }
        )
        return [{"role": "system", "content": system}, {"role": "user", "content": content}]

    async def _complete(self, request: AnalysisRequest, json_mode: bool):
        response_format = (
            {"type": "json_object"}
            if json_mode
            else {
                "type": "json_schema",
                "json_schema": {"name": "analysis_result", "schema": _SCHEMA, "strict": True},
            }
        )
        return await self._client.chat.completions.create(
            model=self._model,
            messages=self._messages(request, json_mode),
            response_format=response_format,
            max_tokens=32000,
        )

    async def analyze(self, request: AnalysisRequest) -> AnalysisResult:
        try:
            try:
                response = await self._complete(request, json_mode=False)
            except openai.BadRequestError as e:
                # Not every model supports schema-constrained output; fall back
                # to plain JSON mode with the schema in the prompt.
                if not _schema_unsupported(e):
                    raise
                log.info("json_schema unsupported by %s, using json_object mode", self._model)
                response = await self._complete(request, json_mode=True)
        except openai.AuthenticationError:
            raise AnalyzerError("Server has an invalid TRUSTEDTOKENS_API_KEY.", 500) from None
        except openai.RateLimitError:
            raise AnalyzerError("Too many requests right now. Try again in a minute.", 429) from None
        except openai.BadRequestError as e:
            log.warning("TrustedTokens rejected request: %s", e.message)
            hint = " (does the model support images?)" if "image" in str(e.message).lower() else ""
            raise AnalyzerError(f"The document could not be processed{hint}: {e.message}", 400) from None
        except openai.APITimeoutError:
            raise AnalyzerError("The AI service took too long. Try fewer pages.", 504) from None
        except openai.APIStatusError as e:
            log.error("TrustedTokens API error %s: %s", e.status_code, e.message)
            raise AnalyzerError("The AI service had an error. Please retry.", 502) from None
        except openai.APIConnectionError:
            raise AnalyzerError("Could not reach the AI service. Please retry.", 504) from None

        choice = response.choices[0]
        log.info("trustedtokens model=%s finish=%s usage=%s", response.model, choice.finish_reason, response.usage)
        if choice.finish_reason == "length":
            raise AnalyzerError("The document is too long to analyse in one go. Try fewer pages.", 413)
        if choice.finish_reason == "content_filter":
            raise AnalyzerError("The AI declined to analyse this document.", 422)
        try:
            return _parse(choice.message.content)
        except ValidationError:
            log.exception("TrustedTokens output failed validation")
            raise AnalyzerError("The AI returned an unreadable answer. Please retry.", 502) from None
