"""HTTP layer only: parse requests, call the service, return typed responses."""

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from ..core.config import APP_VERSION, Settings, get_settings
from ..domains import DOMAINS, Domain, get_domain
from ..schemas.api import (
    AnalyzeResponse,
    DomainUIInfo,
    MetaResponse,
    PrivacyInfo,
    ProcessingInfoOut,
    ProfileInfo,
    SampleInfo,
)
from ..services.analysis_service import AnalysisService
from .deps import get_service

router = APIRouter(prefix="/api")


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


def _profile_info(d: Domain) -> ProfileInfo:
    return ProfileInfo(
        id=d.id,
        name=d.name,
        description=d.description,
        source_language=d.source_language,
        ocr_language=d.ocr_language,
        ui=DomainUIInfo(
            headline=d.ui.headline,
            intro=d.ui.intro,
            upload_title=d.ui.upload_title,
            upload_hint=d.ui.upload_hint,
            disclaimer=d.ui.disclaimer,
            progress=list(d.ui.progress),
        ),
        samples=[SampleInfo(id=s.id, label=s.label, image=s.image) for s in d.samples],
        privacy=PrivacyInfo(
            data_category=d.privacy.data_category,
            requires_consent=d.privacy.requires_consent,
            consent_text=d.privacy.consent_text,
            recommend_eu_processing=d.privacy.recommend_eu_processing,
            redact_personal_data=d.privacy.redact_personal_data,
        ),
        languages=list(d.target_languages),
    )


@router.get("/meta", response_model=MetaResponse)
def meta(
    settings: Annotated[Settings, Depends(get_settings)],
    service: Annotated[AnalysisService, Depends(get_service)],
) -> MetaResponse:
    """Everything the UI needs to configure itself."""
    return MetaResponse(
        version=APP_VERSION,
        analyzer=service.analyzer_name,
        processing=ProcessingInfoOut(
            provider=service.processing.provider,
            region=service.processing.region,
            eu=service.processing.eu,
        ),
        default_profile=settings.default_profile,
        profiles=[_profile_info(d) for d in DOMAINS.values()],
        languages=list(service.domain(None).target_languages),
        max_pages=settings.max_pages,
        max_total_upload_bytes=settings.max_total_upload_bytes,
    )


@router.get("/knowledge/{profile_id}")
def knowledge(profile_id: str) -> dict:
    """The knowledge graph (ontology + rules) behind a domain, as node-link JSON."""
    try:
        domain = get_domain(profile_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e)) from None
    return domain.knowledge().to_json()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    service: Annotated[AnalysisService, Depends(get_service)],
    files: Annotated[list[UploadFile], File(description="One image per page, in order.")],
    profile: Annotated[str | None, Form(description="Domain id, e.g. german_letter.")] = None,
    target_language: Annotated[str, Form()] = "English",
    sample: Annotated[str | None, Form(description="Bundled sample id (demo mode only).")] = None,
    consent: Annotated[bool, Form(description="Explicit consent (required for health documents).")] = False,
) -> AnalyzeResponse:
    data = [await f.read() for f in files]
    return await service.analyze(data, profile, target_language, sample, consent)
