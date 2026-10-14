import os
from pathlib import Path

os.environ["ANALYZER"] = "mock"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.analyzers.prompts import build_system_prompt  # noqa: E402
from app.profiles import get_profile  # noqa: E402
from app.services.analysis_service import sniff_image_type  # noqa: E402

SAMPLE = Path(__file__).resolve().parents[1] / "app" / "fixtures" / "sample_letter.png"
client = TestClient(app)


def test_health():
    assert client.get("/api/health").json() == {"status": "ok"}


def test_meta_lists_profiles():
    body = client.get("/api/meta").json()
    assert body["analyzer"] == "mock"
    assert any(p["id"] == "german_letter" for p in body["profiles"])


def test_analyze_sample_letter():
    png = SAMPLE.read_bytes()
    res = client.post(
        "/api/analyze",
        files=[("files", ("page1.png", png, "image/png"))],
        data={"target_language": "English"},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["page_count"] == 1
    kinds = {k["kind"] for k in body["result"]["key_items"]}
    assert {"deadline", "payment"} <= kinds
    for k in body["result"]["key_items"]:
        b = k["bbox"]
        assert 0 <= b["x0"] < b["x1"] <= 1000 and 0 <= b["y0"] < b["y1"] <= 1000
    checks = body["checks"]
    assert checks["document_class"]["id"] == "bussgeldbescheid"
    assert checks["summary"]["grounded_items"] == checks["summary"]["total_items"]
    assert checks["scam_suspected"] is False


def test_knowledge_endpoint():
    body = client.get("/api/knowledge/german_letter").json()
    assert any(n["id"] == "class:bussgeldbescheid" for n in body["nodes"])
    assert client.get("/api/knowledge/nope").status_code == 404


def test_unreadable_photo_is_refused(monkeypatch):
    from app.analyzers.mock import MockAnalyzer

    original = MockAnalyzer.analyze

    async def unreadable(self, request):
        result = await original(self, request)
        result.image_quality = "unreadable"
        return result

    monkeypatch.setattr(MockAnalyzer, "analyze", unreadable)
    res = client.post("/api/analyze", files=[("files", ("p.png", SAMPLE.read_bytes(), "image/png"))])
    assert res.status_code == 422 and "retake" in res.json()["detail"]


def test_rejects_non_images():
    res = client.post("/api/analyze", files=[("files", ("x.pdf", b"%PDF-1.7", "application/pdf"))])
    assert res.status_code == 415
    assert "not a JPEG" in res.json()["detail"]


def test_rejects_too_many_pages():
    png = SAMPLE.read_bytes()[:2000]
    files = [("files", (f"p{i}.png", png, "image/png")) for i in range(7)]
    assert client.post("/api/analyze", files=files).status_code == 400


def test_sniff():
    assert sniff_image_type(b"\xff\xd8\xff\xe0") == "image/jpeg"
    assert sniff_image_type(b"RIFF\0\0\0\0WEBPVP8 ") == "image/webp"
    assert sniff_image_type(b"hello") is None


def test_system_prompt_includes_profile_and_language():
    prompt = build_system_prompt(get_profile("german_letter"), "Turkish")
    assert "Turkish" in prompt and "Einspruch" in prompt and "{" not in prompt
