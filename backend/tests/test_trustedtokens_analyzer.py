"""Exercises TrustedTokensAnalyzer against a fake HTTP transport (no API key needed)."""

import asyncio
import json

import httpx2 as httpx
import openai
import pytest

from app.analyzers import AnalysisRequest, AnalyzerError, PageImage, create_analyzer
from app.analyzers.trustedtokens import TrustedTokensAnalyzer
from app.core.config import Settings
from app.domains import get_domain

FIXTURE = get_domain("german_letter").sample_answer("bussgeldbescheid")

SETTINGS = Settings(
    analyzer="trustedtokens", trustedtokens_api_key="tt-test", trustedtokens_model="some/vision-model"
)
FIXTURE_TEXT = FIXTURE.read_text(encoding="utf-8")

REQUEST = AnalysisRequest(
    pages=[PageImage(data=b"\xff\xd8\xff fake", media_type="image/jpeg")] * 2,
    domain=get_domain("german_letter"),
    target_language="English",
)


def completion(content: str, finish_reason: str = "stop") -> httpx.Response:
    return httpx.Response(
        200,
        json={
            "id": "chatcmpl-test",
            "object": "chat.completion",
            "created": 0,
            "model": "some/vision-model",
            "choices": [
                {
                    "index": 0,
                    "finish_reason": finish_reason,
                    "message": {"role": "assistant", "content": content},
                }
            ],
            "usage": {"prompt_tokens": 10, "completion_tokens": 10, "total_tokens": 20},
        },
    )


def error(status: int, message: str) -> httpx.Response:
    return httpx.Response(status, json={"error": {"message": message, "type": "invalid_request_error"}})


def make_analyzer(handler) -> TrustedTokensAnalyzer:
    analyzer = TrustedTokensAnalyzer(SETTINGS)
    analyzer._client = openai.AsyncOpenAI(
        api_key="tt-test",
        base_url="https://api.trustedtokens.eu/v1",
        max_retries=0,
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    return analyzer


def run(analyzer):
    return asyncio.run(analyzer.analyze(REQUEST))


def test_factory_selects_trustedtokens():
    assert isinstance(create_analyzer(SETTINGS), TrustedTokensAnalyzer)


def test_missing_key_is_a_clear_error():
    with pytest.raises(ValueError, match="TRUSTEDTOKENS_API_KEY"):
        TrustedTokensAnalyzer(Settings(analyzer="trustedtokens", trustedtokens_api_key=""))


def test_request_shape_and_parsing():
    seen = {}

    def handler(req: httpx.Request) -> httpx.Response:
        seen["url"] = str(req.url)
        seen["auth"] = req.headers["authorization"]
        seen["body"] = json.loads(req.content)
        return completion(FIXTURE_TEXT)

    result = run(make_analyzer(handler))
    assert len(result.key_items) == 8

    body = seen["body"]
    assert seen["url"] == "https://api.trustedtokens.eu/v1/chat/completions"
    assert seen["auth"] == "Bearer tt-test"
    assert body["model"] == "some/vision-model"
    assert body["response_format"]["type"] == "json_schema"
    assert body["response_format"]["json_schema"]["strict"] is True
    images = [c for c in body["messages"][1]["content"] if c["type"] == "image_url"]
    assert len(images) == 2
    assert images[0]["image_url"]["url"].startswith("data:image/jpeg;base64,")


def test_falls_back_to_json_mode_when_schema_unsupported():
    formats = []

    def handler(req: httpx.Request) -> httpx.Response:
        body = json.loads(req.content)
        formats.append(body["response_format"]["type"])
        if body["response_format"]["type"] == "json_schema":
            return error(400, "response_format json_schema is not supported for this model")
        assert "JSON Schema" in body["messages"][0]["content"]
        return completion("```json\n" + FIXTURE_TEXT + "\n```")  # fenced output is tolerated

    result = run(make_analyzer(handler))
    assert formats == ["json_schema", "json_object"]
    assert result.document_type


def test_text_only_model_gets_helpful_error():
    handler = lambda _: error(400, "This model does not support image input")  # noqa: E731
    with pytest.raises(AnalyzerError, match="support images") as e:
        run(make_analyzer(handler))
    assert e.value.status_code == 400


@pytest.mark.parametrize(
    "response, status",
    [
        (completion(FIXTURE_TEXT[:200], finish_reason="length"), 413),
        (completion("not json at all"), 502),
        (error(401, "invalid token"), 500),
        (error(429, "slow down"), 429),
    ],
    ids=["truncated", "invalid-json", "bad-key", "rate-limit"],
)
def test_error_mapping(response, status):
    with pytest.raises(AnalyzerError) as e:
        run(make_analyzer(lambda _: response))
    assert e.value.status_code == status
