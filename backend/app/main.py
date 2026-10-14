"""FastAPI application factory: wires core concerns (logging, CORS, errors) and routes."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router
from .core.config import APP_NAME, APP_VERSION, get_settings
from .core.errors import register_error_handlers
from .core.logging import configure_logging, register_request_logging


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging()
    app = FastAPI(
        title=f"{APP_NAME} API",
        version=APP_VERSION,
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )

    # Only needed when the frontend is served from a different origin;
    # on Vercel's one-project deploy both live on the same domain.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )
    register_request_logging(app)
    register_error_handlers(app)
    app.include_router(router)
    return app


app = create_app()
