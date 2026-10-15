"""Write the backend's OpenAPI description to docs/openapi.json (run from backend/).

    python scripts/export_openapi.py

The frontend (or any other client) can generate types or mocks from it.
"""

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("ANALYZER", "mock")

from app.main import app  # noqa: E402

out = Path(__file__).resolve().parents[2] / "docs" / "openapi.json"
out.write_text(json.dumps(app.openapi(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print(f"wrote {out}")
