"""Both Vercel entry points must load the app, and their dependencies must match."""

import os
import runpy
from pathlib import Path

os.environ["ANALYZER"] = "mock"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

BACKEND = Path(__file__).resolve().parents[1]
REPO = BACKEND.parent


@pytest.mark.parametrize(
    "entry",
    [BACKEND / "api" / "index.py", REPO / "api" / "index.py"],
    ids=["backend-project", "one-project"],
)
def test_entrypoint_serves_api(entry):
    app = runpy.run_path(str(entry))["app"]
    assert TestClient(app).get("/api/health").json() == {"status": "ok"}


def _packages(path: Path) -> list[str]:
    lines = path.read_text(encoding="utf-8").splitlines()
    return sorted(line.strip() for line in lines if line.strip() and not line.startswith("#"))


def test_root_requirements_match_backend():
    assert _packages(REPO / "requirements.txt") == _packages(BACKEND / "requirements.txt")
