"""Every registered domain pack must be complete. Catches half-finished packs early."""

import os
from pathlib import Path

import pytest

os.environ.setdefault("ANALYZER", "mock")

from fastapi.testclient import TestClient  # noqa: E402

from app.analyzers.prompts import build_system_prompt  # noqa: E402
from app.domains import DOMAINS  # noqa: E402
from app.main import app  # noqa: E402
from app.schemas.analysis import AnalysisResult  # noqa: E402

FRONTEND_PUBLIC = Path(__file__).resolve().parents[2] / "frontend" / "public"


@pytest.mark.parametrize("domain", DOMAINS.values(), ids=list(DOMAINS))
def test_domain_pack_is_complete(domain):
    kg = domain.knowledge()  # ontology.json + rules.json load and validate
    assert kg.rules, "a domain needs at least one rule"
    assert domain.target_languages and domain.ui.progress
    assert "{max_pages}" in domain.ui.upload_hint
    assert domain.id in build_system_prompt(domain, "English") or domain.name in build_system_prompt(
        domain, "English"
    )

    assert domain.samples, "demo mode needs at least one sample"
    for sample in domain.samples:
        answer = domain.sample_answer(sample.id)
        assert answer is not None, f"missing samples/{sample.id}.json"
        result = AnalysisResult.model_validate_json(answer.read_text(encoding="utf-8"))
        assert result.document_class == "unknown" or kg.has_class(result.document_class)
        if FRONTEND_PUBLIC.exists():
            assert (FRONTEND_PUBLIC / sample.image.lstrip("/")).is_file(), f"missing image {sample.image}"


def test_sample_lookup_cannot_escape_the_domain_folder():
    domain = next(iter(DOMAINS.values()))
    assert domain.sample_answer("../rules") is None
    assert domain.sample_answer("../../../../etc/passwd") is None
    assert domain.sample_answer(None) is None


def test_meta_exposes_domain_ui_and_samples():
    body = TestClient(app).get("/api/meta").json()
    profile = next(p for p in body["profiles"] if p["id"] == body["default_profile"])
    assert profile["ui"]["headline"] and profile["samples"] and profile["ocr_language"]
    assert body["version"]


def test_request_id_is_returned_and_propagated():
    client = TestClient(app)
    assert client.get("/api/health").headers["x-request-id"]
    assert client.get("/api/health", headers={"X-Request-ID": "abc123"}).headers["x-request-id"] == "abc123"
