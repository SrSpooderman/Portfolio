from datetime import UTC, datetime
import hashlib
import re
from urllib.parse import urlsplit
from uuid import UUID

import redis
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import AnalyticsEvent, Publication, TrackedLink, User
from app.security import current_user, rate_limit
from app.shared.infrastructure.redis_gateway import RedisGateway

public_router = APIRouter(tags=["public"])
admin_router = APIRouter(prefix="/api/v1/admin/analytics", tags=["analytics"], dependencies=[Depends(current_user)])
EVENT_TYPES = {
    "page_view",
    "section_view",
    "project_view",
    "button_click",
    "link_click",
    "demo_open",
    "github_click",
    "contact_click",
    "cv_download",
    "tracked_link_click",
    # Kept for snapshots produced by early versions of the editor.
    "click",
    "download",
}
PUBLICATION_REF = re.compile(r"v([1-9]\d*)(?:-([0-9a-fA-F]{6,64}))?")
BOT_MARKERS = ("bot", "crawler", "spider", "slurp", "bingpreview", "facebookexternalhit")


class AnalyticsFilters:
    def __init__(self, from_date: datetime | None = Query(default=None, alias="from"), to_date: datetime | None = Query(default=None, alias="to"), page_id: str | None = None, project_id: str | None = None, publication_id: str | None = None):
        if from_date and to_date and from_date > to_date:
            raise HTTPException(422, "The from date must be before the to date")
        self.from_date = from_date
        self.to_date = to_date
        self.page_id = page_id
        self.project_id = project_id
        self.publication_id = publication_id

    def clauses(self):
        result = [or_(AnalyticsEvent.metadata_json.is_(None), AnalyticsEvent.metadata_json["traffic"].as_string() != "bot")]
        if self.from_date:
            result.append(AnalyticsEvent.occurred_at >= self.from_date)
        if self.to_date:
            result.append(AnalyticsEvent.occurred_at <= self.to_date)
        if self.page_id:
            result.append(AnalyticsEvent.page_id == self.page_id)
        if self.project_id:
            result.append(AnalyticsEvent.project_id == self.project_id)
        if self.publication_id:
            result.append(AnalyticsEvent.publication_id == self.publication_id)
        return result


class EventInput(BaseModel):
    event_id: UUID
    event_type: str
    target_key: str | None = None
    publication: str | None = None
    page_id: str | None = None
    project_id: str | None = None


def publication_from_ref(db: Session, reference: str | None) -> Publication | None:
    if not reference:
        return None
    match = PUBLICATION_REF.fullmatch(reference)
    if match is None:
        raise HTTPException(422, "Unknown publication")
    publication = db.scalar(select(Publication).where(Publication.version_number == int(match.group(1))))
    hash_prefix = match.group(2)
    if publication is None or (hash_prefix and not publication.content_hash.lower().startswith(hash_prefix.lower())):
        raise HTTPException(422, "Unknown publication")
    return publication


def request_dimensions(request: Request) -> dict[str, str]:
    """Return deliberately coarse, privacy-friendly request dimensions."""
    user_agent = request.headers.get("user-agent", "").lower()
    if any(marker in user_agent for marker in BOT_MARKERS):
        traffic = "bot"
    elif user_agent:
        traffic = "human-like"
    else:
        traffic = "unknown"
    if any(marker in user_agent for marker in ("mobile", "android", "iphone")):
        device = "mobile"
    elif any(marker in user_agent for marker in ("ipad", "tablet")):
        device = "tablet"
    else:
        device = "desktop" if user_agent else "unknown"
    browsers = (("edg/", "Edge"), ("firefox/", "Firefox"), ("chrome/", "Chrome"), ("safari/", "Safari"))
    browser = next((name for marker, name in browsers if marker in user_agent), "Other")
    country = request.headers.get("cf-ipcountry") or request.headers.get("x-country-code") or ""
    country = country.upper() if re.fullmatch(r"[A-Za-z]{2}", country) else ""
    return {"traffic": traffic, "device": device, "browser": browser, "country": country}


def visitor_key(request: Request) -> str:
    # Rotating daily input prevents this pseudonymous key becoming a durable identifier.
    address = request.client.host if request.client else "unknown"
    material = f"{datetime.now(UTC):%Y-%m-%d}|{address}|{request.headers.get('user-agent', '')}|{settings.refresh_token_pepper}"
    return hashlib.sha256(material.encode()).hexdigest()


def safe_referrer(request: Request) -> str | None:
    raw = request.headers.get("referer", "")
    if not raw:
        return None
    try:
        parsed = urlsplit(raw)
    except ValueError:
        return None
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None
    return f"{parsed.scheme}://{parsed.netloc}{parsed.path}"[:2000]


def redis_counter(*parts: str) -> None:
    try:
        RedisGateway(settings.redis_url).increment("analytics", parts)
    except redis.RedisError:
        # MySQL remains the source of truth; hot counters are only an acceleration layer.
        return


def cached_link(slug: str, db: Session) -> dict | None:
    key = "redirect:" + slug
    try:
        gateway = RedisGateway(settings.redis_url)
        cached = gateway.get(key)
        if cached:
            return cached
    except (redis.RedisError, ValueError, TypeError):
        gateway = None
    link = db.scalar(select(TrackedLink).where(TrackedLink.slug == slug, TrackedLink.is_enabled.is_(True)))
    if link is None:
        return None
    payload = {"id": link.id, "url": link.destination_url, "tracking": link.tracking_enabled, "project_id": link.project_id}
    if gateway is not None:
        try:
            gateway.set(key, payload, 300)
        except redis.RedisError:
            pass
    return payload


@public_router.post("/api/v1/public/analytics/events", status_code=202)
def accept_event(body: EventInput, request: Request, db: Session = Depends(get_db)):
    if body.event_type not in EVENT_TYPES:
        raise HTTPException(422, "Unknown event type")
    rate_limit("events:" + (request.client.host if request.client else "unknown"), 120, 60)
    if db.scalar(select(AnalyticsEvent).where(AnalyticsEvent.event_id == str(body.event_id))):
        return {"accepted": True}
    pub = publication_from_ref(db, body.publication)
    if pub and body.page_id and body.page_id not in {page["id"] for page in pub.snapshot.get("pages", {}).values()}:
        raise HTTPException(422, "Page does not belong to publication")
    if pub and body.project_id and body.project_id not in pub.snapshot.get("projects", {}):
        raise HTTPException(422, "Project does not belong to publication")
    dimensions = request_dimensions(request)
    db.add(AnalyticsEvent(event_id=str(body.event_id), event_type=body.event_type, target_key=body.target_key, publication_id=pub.id if pub else None, page_id=body.page_id, project_id=body.project_id, referrer=safe_referrer(request), device_type=dimensions["device"], browser_family=dimensions["browser"], country_code=dimensions["country"] or None, visitor_key=visitor_key(request), metadata_json={"traffic": dimensions["traffic"]}))
    db.commit()
    if dimensions["traffic"] != "bot":
        redis_counter(body.event_type, body.target_key or body.project_id or body.page_id or "all")
    return {"accepted": True}


@public_router.get("/go/{slug}")
def go(slug: str, request: Request, db: Session = Depends(get_db)):
    link = cached_link(slug, db)
    if link is None:
        raise HTTPException(404)
    try:
        parsed = urlsplit(link["url"])
    except ValueError:
        raise HTTPException(422, "Invalid destination") from None
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise HTTPException(422, "Invalid destination")
    if link["tracking"]:
        rate_limit("go:" + (request.client.host if request.client else "unknown"), 120, 60)
        dimensions = request_dimensions(request)
        db.add(AnalyticsEvent(event_type="tracked_link_click", tracked_link_id=link["id"], project_id=link["project_id"], target_key=slug, referrer=safe_referrer(request), device_type=dimensions["device"], browser_family=dimensions["browser"], country_code=dimensions["country"] or None, visitor_key=visitor_key(request), metadata_json={"traffic": dimensions["traffic"]}))
        db.commit()
        if dimensions["traffic"] != "bot":
            redis_counter("tracked_link_click", slug)
    return RedirectResponse(link["url"], status_code=302)


@admin_router.get("/overview")
def overview(filters: AnalyticsFilters = Depends(), db: Session = Depends(get_db)):
    counts = db.execute(select(AnalyticsEvent.event_type, func.count()).where(*filters.clauses()).group_by(AnalyticsEvent.event_type)).all()
    visitors = db.scalar(select(func.count(func.distinct(AnalyticsEvent.visitor_key))).where(AnalyticsEvent.visitor_key.is_not(None), *filters.clauses())) or 0
    devices = dict(db.execute(select(AnalyticsEvent.device_type, func.count()).where(AnalyticsEvent.device_type.is_not(None), *filters.clauses()).group_by(AnalyticsEvent.device_type)).all())
    browsers = dict(db.execute(select(AnalyticsEvent.browser_family, func.count()).where(AnalyticsEvent.browser_family.is_not(None), *filters.clauses()).group_by(AnalyticsEvent.browser_family)).all())
    by_type = dict(counts)
    click_types = {"button_click", "link_click", "demo_open", "github_click", "contact_click", "cv_download", "tracked_link_click", "click", "download"}
    return {"total": sum(count for _, count in counts), "visitors": visitors, "page_views": by_type.get("page_view", 0), "project_views": by_type.get("project_view", 0), "external_clicks": sum(by_type.get(kind, 0) for kind in click_types), "by_type": by_type, "by_device": devices, "by_browser": browsers}


@admin_router.get("/timeseries")
def timeseries(filters: AnalyticsFilters = Depends(), db: Session = Depends(get_db)):
    day = func.date(AnalyticsEvent.occurred_at)
    return [{"date": str(date), "count": count} for date, count in db.execute(select(day, func.count()).where(*filters.clauses()).group_by(day).order_by(day))]


@admin_router.get("/interactions")
def interactions(filters: AnalyticsFilters = Depends(), db: Session = Depends(get_db)):
    return [{"target_key": key, "count": count} for key, count in db.execute(select(AnalyticsEvent.target_key, func.count()).where(AnalyticsEvent.target_key.is_not(None), *filters.clauses()).group_by(AnalyticsEvent.target_key).order_by(func.count().desc()).limit(50))]


@admin_router.get("/projects")
def projects(filters: AnalyticsFilters = Depends(), db: Session = Depends(get_db)):
    return [{"project_id": key, "count": count} for key, count in db.execute(select(AnalyticsEvent.project_id, func.count()).where(AnalyticsEvent.project_id.is_not(None), *filters.clauses()).group_by(AnalyticsEvent.project_id))]


@admin_router.get("/referrers")
def referrers(filters: AnalyticsFilters = Depends(), db: Session = Depends(get_db)):
    return [{"referrer": key, "count": count} for key, count in db.execute(select(AnalyticsEvent.referrer, func.count()).where(AnalyticsEvent.referrer.is_not(None), *filters.clauses()).group_by(AnalyticsEvent.referrer).order_by(func.count().desc()).limit(50))]


@admin_router.get("/funnels")
def funnels(filters: AnalyticsFilters = Depends(), db: Session = Depends(get_db)):
    steps = ["page_view", "section_view", "project_view", "demo_open", "github_click"]
    counts = dict(db.execute(select(AnalyticsEvent.event_type, func.count(func.distinct(AnalyticsEvent.visitor_key))).where(AnalyticsEvent.event_type.in_(steps), AnalyticsEvent.visitor_key.is_not(None), *filters.clauses()).group_by(AnalyticsEvent.event_type)).all())
    baseline = counts.get("page_view", 0)
    return [{"event_type": step, "visitors": counts.get(step, 0), "conversion": round(counts.get(step, 0) * 100 / baseline, 2) if baseline else 0} for step in steps]
