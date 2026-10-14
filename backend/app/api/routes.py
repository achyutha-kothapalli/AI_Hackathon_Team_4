from functools import lru_cache
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from ..analyzers import create_analyzer
from ..config import Settings, get_settings
from ..knowledge import load_knowledge
from ..profiles import PROFILES, get_profile
from ..schemas.analysis import AnalyzeResponse
from ..services.analysis_service import SUPPORTED_LANGUAGES, AnalysisService

router = APIRouter(prefix="/api")


@lru_cache
def get_service() -> AnalysisService:
    settings = get_settings()
    return AnalysisService(settings, create_analyzer(settings))


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/meta")
def meta(
    settings: Annotated[Settings, Depends(get_settings)],
    service: Annotated[AnalysisService, Depends(get_service)],
) -> dict:
    """Everything the UI needs to configure itself."""
    return {
        "analyzer": service.analyzer_name,
        "default_profile": settings.default_profile,
        "profiles": [
            {"id": p.id, "name": p.name, "description": p.description, "source_language": p.source_language}
            for p in PROFILES.values()
        ],
        "languages": SUPPORTED_LANGUAGES,
        "max_pages": settings.max_pages,
        "max_total_upload_bytes": settings.max_total_upload_bytes,
    }


@router.get("/knowledge/{profile_id}")
def knowledge(profile_id: str) -> dict:
    """The knowledge graph (ontology + rules) behind a profile, as node-link JSON."""
    try:
        profile = get_profile(profile_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e)) from None
    return load_knowledge(profile.knowledge).to_json()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    service: Annotated[AnalysisService, Depends(get_service)],
    files: Annotated[list[UploadFile], File(description="One image per page, in order.")],
    profile: Annotated[str | None, Form()] = None,
    target_language: Annotated[str, Form()] = "English",
    sample: Annotated[str | None, Form(description="Bundled sample id (demo mode only).")] = None,
) -> AnalyzeResponse:
    data = [await f.read() for f in files]
    return await service.analyze(data, profile, target_language, sample)
