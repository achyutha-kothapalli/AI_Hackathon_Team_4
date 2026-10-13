# Vercel serverless entry point. vercel.json rewrites every path here; the
# FastAPI app itself lives in app/ so it also runs locally with uvicorn.
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app  # noqa: E402

__all__ = ["app"]
