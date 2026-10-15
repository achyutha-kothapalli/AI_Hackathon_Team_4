"""A domain pack bundles everything specific to one use case.

The engine (analyzers, harness, API, UI) is generic. A domain pack supplies:

  - instructions   what the AI should look for (appended to the generic prompt)
  - ontology.json  document classes, legal bases, help resources   } knowledge graph
  - rules.json     accuracy & safety rules                          } used by the harness
  - samples/       exact answers for the sample documents (demo mode, tests)
  - ui             the wording the frontend shows for this use case

To support a new problem, copy app/domains/german_letter/, edit it, and register
it in app/domains/__init__.py. See CONTRIBUTING.md.
"""

from dataclasses import dataclass, field
from pathlib import Path

from ..knowledge import KnowledgeGraph, load_knowledge


@dataclass(frozen=True)
class SampleDocument:
    id: str  # also the file name of samples/<id>.json
    label: str  # button text in the UI
    image: str  # path served by the frontend, e.g. /sample/<id>.png


@dataclass(frozen=True)
class DomainUI:
    """Texts the frontend shows. Served via GET /api/meta."""

    headline: str
    intro: str
    upload_title: str
    upload_hint: str  # "{max_pages}" is replaced by the page limit
    disclaimer: str
    progress: tuple[str, ...]


@dataclass(frozen=True)
class DomainPrivacy:
    """Data-protection settings (DSGVO/GDPR) for a use case."""

    # "personal" or "health" (special category, Art. 9 GDPR)
    data_category: str = "personal"
    # Explicit consent before upload (Art. 9(2)(a) GDPR); enforced by the backend.
    requires_consent: bool = False
    # Shown next to the consent checkbox; {provider} and {region} are filled in.
    consent_text: str | None = None
    # Warn in the UI if the configured AI provider processes data outside the EU.
    recommend_eu_processing: bool = False


@dataclass(frozen=True)
class Domain:
    id: str
    name: str
    description: str
    # Domain instructions appended to the shared extraction prompt.
    instructions: str
    # Folder with ontology.json, rules.json and samples/.
    folder: Path
    ui: DomainUI
    samples: tuple[SampleDocument, ...] = ()
    # Shown in the UI as the expected source language; the model still detects it.
    source_language: str = "German"
    # Tesseract language code for the browser's OCR verification.
    ocr_language: str = "deu"
    target_languages: tuple[str, ...] = field(default=("English",))
    privacy: DomainPrivacy = field(default_factory=DomainPrivacy)

    def knowledge(self) -> KnowledgeGraph:
        return load_knowledge(self.folder)

    def sample_answer(self, sample_id: str | None) -> Path | None:
        """Path of samples/<id>.json if it exists (never escapes the folder)."""
        if not sample_id:
            return None
        path = (self.folder / "samples" / f"{sample_id}.json").resolve()
        if path.parent != (self.folder / "samples").resolve() or not path.is_file():
            return None
        return path
