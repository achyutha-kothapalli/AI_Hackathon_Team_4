"""Exercises ClaudeAnalyzer against a fake HTTP transport (no API key needed)."""

import asyncio
import json

import anthropic
import httpx2 as httpx
import pytest

from app.analyzers import AnalysisRequest, AnalyzerError, PageImage
from app.analyzers.claude import ClaudeAnalyzer
from app.core.config import Settings
from app.domains import get_domain

FIXTURE = get_domain("german_letter").sample_answer("bussgeldbescheid")


def make_analyzer(handler) -> ClaudeAnalyzer:
    analyzer = ClaudeAnalyzer(Settings(analyzer="claude"))
    analyzer._client = anthropic.AsyncAnthropic(
        api_key="test-key",
        max_retries=0,
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    return analyzer


def sse(text: str, stop_reason: str = "end_turn") -> httpx.Response:
    """A minimal streamed Messages API response containing one text block."""
    events = [
        (
            "message_start",
            {
                "type": "message_start",
                "message": {
                    "id": "msg_test",
                    "type": "message",
                    "role": "assistant",
                    "model": "claude-opus-5-5",
                    "content": [],
                    "stop_reason": None,
                    "stop_sequence": None,
                    "usage": {"input_tokens": 10, "output_tokens": 0},
                },
            },
        ),
        (
            "content_block_start",
            {"type": "content_block_start", "index": 0, "content_block": {"type": "text", "text": ""}},
        ),
        (
            "content_block_delta",
            {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": text}},
        ),
        ("content_block_stop", {"type": "content_block_stop", "index": 0}),
        (
            "message_delta",
            {
                "type": "message_delta",
                "delta": {"stop_reason": stop_reason, "stop_sequence": None},
                "usage": {"output_tokens": 10},
            },
        ),
        ("message_stop", {"type": "message_stop"}),
    ]
    body = "".join(f"event: {name}\ndata: {json.dumps(data)}\n\n" for name, data in events)
    return httpx.Response(200, headers={"content-type": "text/event-stream"}, content=body.encode())


REQUEST = AnalysisRequest(
    pages=[PageImage(data=b"\xff\xd8\xff fake", media_type="image/jpeg")] * 2,
    domain=get_domain("german_letter"),
    target_language="English",
)


def test_request_shape_and_parsing():
    seen = {}

    def handler(req: httpx.Request) -> httpx.Response:
        seen["headers"] = req.headers
        seen["body"] = json.loads(req.content)
        return sse(FIXTURE.read_text(encoding="utf-8"))

    result = asyncio.run(make_analyzer(handler).analyze(REQUEST))
    assert result.key_items and result.blocks

    body = seen["body"]
    assert body["model"] == "claude-opus-5-5"
    assert body["fallbacks"] == "default"
    assert body["output_config"]["effort"] == "medium"
    assert body["output_config"]["format"]["type"] == "json_schema"
    assert "server-side-fallback-2026-07-01" in seen["headers"]["anthropic-beta"]
    images = [c for c in body["messages"][0]["content"] if c["type"] == "image"]
    assert len(images) == 2


def test_refusal_becomes_user_error():
    handler = lambda _: sse("", stop_reason="refusal")  # noqa: E731
    with pytest.raises(AnalyzerError) as e:
        asyncio.run(make_analyzer(handler).analyze(REQUEST))
    assert e.value.status_code == 422


def test_truncated_output_maps_to_413():
    handler = lambda _: sse('{"document_type": "Fine', stop_reason="max_tokens")  # noqa: E731
    with pytest.raises(AnalyzerError) as e:
        asyncio.run(make_analyzer(handler).analyze(REQUEST))
    assert e.value.status_code == 413


def test_rate_limit_maps_to_429():
    def handler(_):
        return httpx.Response(
            429, json={"type": "error", "error": {"type": "rate_limit_error", "message": "slow"}}
        )

    with pytest.raises(AnalyzerError) as e:
        asyncio.run(make_analyzer(handler).analyze(REQUEST))
    assert e.value.status_code == 429
