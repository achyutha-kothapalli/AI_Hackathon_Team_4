# Entry point for deploying the WHOLE repo as one Vercel project (root vercel.json).
# It only forwards to the backend; all code lives in backend/app.
# When deploying backend/ as its own project, backend/api/index.py is used instead.
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.main import app  # noqa: E402

__all__ = ["app"]
