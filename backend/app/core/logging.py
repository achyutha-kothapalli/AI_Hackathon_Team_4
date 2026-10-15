"""Logging setup, request IDs and stage timing.

Every request gets an id (taken from an incoming `X-Request-ID` header or
generated), returned in the `X-Request-ID` response header and included in all
log lines for that request. `timed()` logs how long a pipeline stage took.
"""

import logging
import time
import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from contextvars import ContextVar

from fastapi import FastAPI, Request

request_id: ContextVar[str] = ContextVar("request_id", default="-")

log = logging.getLogger("app")


class _RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id.get()
        return True


def configure_logging(level: int = logging.INFO) -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(levelname)s [%(request_id)s] %(name)s: %(message)s"))
    handler.addFilter(_RequestIdFilter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)


@contextmanager
def timed(stage: str) -> Iterator[None]:
    """Log the duration of a pipeline stage, e.g. `with timed("analyzer"): ...`."""
    start = time.perf_counter()
    try:
        yield
    finally:
        log.info("stage=%s duration_ms=%.0f", stage, (time.perf_counter() - start) * 1000)


def register_request_logging(app: FastAPI) -> None:
    @app.middleware("http")
    async def request_context(request: Request, call_next):
        rid = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
        token = request_id.set(rid)
        start = time.perf_counter()
        try:
            response = await call_next(request)
        finally:
            request_id.reset(token)
        response.headers["X-Request-ID"] = rid
        log.info(
            "%s %s -> %s in %.0f ms [%s]",
            request.method,
            request.url.path,
            response.status_code,
            (time.perf_counter() - start) * 1000,
            rid,
        )
        return response
