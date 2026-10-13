import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .analyzers import AnalyzerError
from .api.routes import router
from .config import get_settings

logging.basicConfig(level=logging.INFO)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Letter Lens API", version="0.1.0", docs_url="/api/docs", openapi_url="/api/openapi.json")

    # Only needed when the frontend is served from a different origin;
    # on Vercel both live on the same domain.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(AnalyzerError)
    async def analyzer_error_handler(_: Request, exc: AnalyzerError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})

    app.include_router(router)
    return app


app = create_app()
