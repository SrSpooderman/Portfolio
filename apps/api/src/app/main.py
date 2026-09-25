import json
import logging
import tempfile
import time
import uuid
from datetime import UTC, datetime

import redis
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app import analytics, audit, auth, composition, editor, publishing, resources
from app.config import settings
from app.db import engine

app = FastAPI(title="Portfolio CMS API", version="0.1.0")
app.include_router(auth.router)
app.include_router(editor.router)
app.include_router(composition.router)
app.include_router(resources.router)
app.include_router(publishing.router)
app.include_router(analytics.public_router)
app.include_router(analytics.admin_router)
app.include_router(audit.router)
logger = logging.getLogger("portfolio.api")
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
logger.propagate = False


def problem(status: int, title: str, detail, code: str, context: dict | None = None) -> JSONResponse:
    return JSONResponse({"type": f"https://portfolio.local/problems/{code.lower().replace('_', '-')}", "title": title, "status": status, "code": code, "detail": detail, "context": context or {}}, status_code=status)


@app.exception_handler(HTTPException)
async def http_problem(_request: Request, exc: HTTPException):
    detail = exc.detail
    code = detail.get("code", "HTTP_ERROR") if isinstance(detail, dict) else "HTTP_ERROR"
    context = detail if isinstance(detail, dict) else None
    return problem(exc.status_code, "Request failed", detail, code, context)


@app.exception_handler(RequestValidationError)
async def validation_problem(_request: Request, exc: RequestValidationError):
    return problem(422, "Request validation failed", jsonable_encoder(exc.errors()), "REQUEST_VALIDATION_ERROR")


@app.middleware("http")
async def request_headers(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    started = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    logger.info(json.dumps({"timestamp": datetime.now(UTC).isoformat(), "level": "INFO", "event": "http.request", "request_id": request_id, "method": request.method, "path": request.url.path, "status": response.status_code, "duration_ms": round((time.perf_counter() - started) * 1000, 2)}, separators=(",", ":")))
    return response


@app.get("/health/live")
def live():
    return {"status": "ok"}


@app.get("/health/ready")
def ready():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        redis.from_url(settings.redis_url).ping()
        settings.publication_path.mkdir(parents=True, exist_ok=True)
        settings.asset_path.mkdir(parents=True, exist_ok=True)
        for path in (settings.publication_path, settings.asset_path):
            with tempfile.NamedTemporaryFile(dir=path):
                pass
    except Exception:
        return JSONResponse({"status": "unavailable"}, status_code=503)
    return {"status": "ok"}
