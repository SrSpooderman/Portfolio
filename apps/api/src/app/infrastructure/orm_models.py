from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import JSON, BigInteger, Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base, new_id, utcnow


def uid():
    return mapped_column(String(36), primary_key=True, default=new_id)


def created():
    return mapped_column(DateTime, default=utcnow)


def updated():
    return mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = uid()
    email: Mapped[str] = mapped_column(String(255), unique=True)
    username: Mapped[str] = mapped_column(String(100), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superadmin: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = created()
    updated_at: Mapped[datetime] = updated()


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id: Mapped[str] = uid()
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = created()
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime)
    user_agent: Mapped[str | None] = mapped_column(String(500))
    ip_address: Mapped[str | None] = mapped_column(String(45))


class Document(Base):
    __tablename__ = "editor_documents"
    id: Mapped[str] = uid()
    document_type: Mapped[str] = mapped_column(String(30))
    name: Mapped[str] = mapped_column(String(255))
    revision: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = created()
    updated_at: Mapped[datetime] = updated()


class Page(Base):
    __tablename__ = "pages"
    document_id: Mapped[str] = mapped_column(ForeignKey("editor_documents.id"), primary_key=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True)
    title: Mapped[str] = mapped_column(String(255))
    is_home: Mapped[bool] = mapped_column(Boolean, default=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    seo_title: Mapped[str | None] = mapped_column(String(255))
    seo_description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = created()
    updated_at: Mapped[datetime] = updated()


class Node(Base):
    __tablename__ = "nodes"
    id: Mapped[str] = uid()
    document_id: Mapped[str] = mapped_column(ForeignKey("editor_documents.id"), index=True)
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("nodes.id"), index=True)
    node_type: Mapped[str] = mapped_column(String(100))
    position: Mapped[Decimal] = mapped_column(Numeric(20, 10), default=10)
    props: Mapped[dict] = mapped_column(JSON, default=dict)
    layout: Mapped[dict] = mapped_column(JSON, default=dict)
    style_overrides: Mapped[dict] = mapped_column(JSON, default=dict)
    analytics_key: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = created()
    updated_at: Mapped[datetime] = updated()


class StyleClass(Base):
    __tablename__ = "style_classes"
    id: Mapped[str] = uid()
    name: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(255), unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = created()
    updated_at: Mapped[datetime] = updated()


class StyleRule(Base):
    __tablename__ = "style_class_rules"
    __table_args__ = (UniqueConstraint("style_class_id", "breakpoint", "state"),)
    id: Mapped[str] = uid()
    style_class_id: Mapped[str] = mapped_column(ForeignKey("style_classes.id"))
    breakpoint: Mapped[str] = mapped_column(String(30))
    state: Mapped[str] = mapped_column(String(30))
    properties: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = created()
    updated_at: Mapped[datetime] = updated()


class NodeStyleClass(Base):
    __tablename__ = "node_style_classes"
    node_id: Mapped[str] = mapped_column(ForeignKey("nodes.id"), primary_key=True)
    style_class_id: Mapped[str] = mapped_column(ForeignKey("style_classes.id"), primary_key=True)
    position: Mapped[int] = mapped_column(Integer)


class DesignToken(Base):
    __tablename__ = "design_tokens"
    id: Mapped[str] = uid()
    key: Mapped[str] = mapped_column(String(255), unique=True)
    category: Mapped[str] = mapped_column(String(50))
    type: Mapped[str] = mapped_column(String(50))
    value: Mapped[dict | str | int] = mapped_column(JSON)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = created()
    updated_at: Mapped[datetime] = updated()


class Component(Base):
    __tablename__ = "components"
    document_id: Mapped[str] = mapped_column(ForeignKey("editor_documents.id"), primary_key=True)
    key: Mapped[str] = mapped_column(String(255), unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = created()
    updated_at: Mapped[datetime] = updated()


class ComponentInstance(Base):
    __tablename__ = "component_instances"
    node_id: Mapped[str] = mapped_column(ForeignKey("nodes.id"), primary_key=True)
    component_document_id: Mapped[str] = mapped_column(ForeignKey("components.document_id"))
    created_at: Mapped[datetime] = created()
    updated_at: Mapped[datetime] = updated()


class ComponentOverride(Base):
    __tablename__ = "component_instance_overrides"
    instance_node_id: Mapped[str] = mapped_column(ForeignKey("component_instances.node_id"), primary_key=True)
    target_component_node_id: Mapped[str] = mapped_column(ForeignKey("nodes.id"), primary_key=True)
    props_override: Mapped[dict | None] = mapped_column(JSON)
    style_override: Mapped[dict | None] = mapped_column(JSON)


class ComponentClassOverride(Base):
    __tablename__ = "component_instance_class_overrides"
    instance_node_id: Mapped[str] = mapped_column(ForeignKey("component_instances.node_id"), primary_key=True)
    target_component_node_id: Mapped[str] = mapped_column(ForeignKey("nodes.id"), primary_key=True)
    style_class_id: Mapped[str] = mapped_column(ForeignKey("style_classes.id"), primary_key=True)
    action: Mapped[str] = mapped_column(String(10))
    position: Mapped[int | None] = mapped_column(Integer)


class Template(Base):
    __tablename__ = "templates"
    id: Mapped[str] = uid()
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(100))
    template_type: Mapped[str] = mapped_column(String(30))
    snapshot: Mapped[dict] = mapped_column(JSON)
    preview_asset_id: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[datetime] = created()
    updated_at: Mapped[datetime] = updated()


class Asset(Base):
    __tablename__ = "assets"
    id: Mapped[str] = uid()
    sha256: Mapped[str] = mapped_column(String(64), unique=True)
    original_filename: Mapped[str] = mapped_column(String(500))
    storage_key: Mapped[str] = mapped_column(String(1000))
    mime_type: Mapped[str] = mapped_column(String(150))
    size_bytes: Mapped[int] = mapped_column(BigInteger)
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    alt_text: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = created()
    updated_at: Mapped[datetime] = updated()


class AssetVariant(Base):
    __tablename__ = "asset_variants"
    id: Mapped[str] = uid()
    asset_id: Mapped[str] = mapped_column(ForeignKey("assets.id"))
    variant: Mapped[str] = mapped_column(String(50))
    storage_key: Mapped[str] = mapped_column(String(1000))
    mime_type: Mapped[str] = mapped_column(String(100))
    width: Mapped[int] = mapped_column(Integer)
    height: Mapped[int] = mapped_column(Integer)
    size_bytes: Mapped[int] = mapped_column(BigInteger)


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[str] = uid()
    slug: Mapped[str] = mapped_column(String(255), unique=True)
    title: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    project_type: Mapped[str] = mapped_column(String(50), default="OTHER")
    status: Mapped[str] = mapped_column(String(30), default="DRAFT")
    cover_asset_id: Mapped[str | None] = mapped_column(ForeignKey("assets.id"))
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[Decimal] = mapped_column(Numeric(20, 10), default=10)
    started_at: Mapped[date | None] = mapped_column(Date)
    completed_at: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = created()
    updated_at: Mapped[datetime] = updated()


class Technology(Base):
    __tablename__ = "technologies"
    id: Mapped[str] = uid()
    name: Mapped[str] = mapped_column(String(100), unique=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True)
    icon_asset_id: Mapped[str | None] = mapped_column(ForeignKey("assets.id"))


class ProjectTechnology(Base):
    __tablename__ = "project_technologies"
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), primary_key=True)
    technology_id: Mapped[str] = mapped_column(ForeignKey("technologies.id"), primary_key=True)
    position: Mapped[int] = mapped_column(Integer)


class TrackedLink(Base):
    __tablename__ = "tracked_links"
    id: Mapped[str] = uid()
    slug: Mapped[str] = mapped_column(String(255), unique=True)
    name: Mapped[str] = mapped_column(String(255))
    destination_url: Mapped[str] = mapped_column(Text)
    tracking_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id"))
    created_at: Mapped[datetime] = created()
    updated_at: Mapped[datetime] = updated()


class Publication(Base):
    __tablename__ = "publications"
    id: Mapped[str] = uid()
    version_number: Mapped[int] = mapped_column(Integer, unique=True)
    content_hash: Mapped[str] = mapped_column(String(64), unique=True)
    filename: Mapped[str] = mapped_column(String(255), unique=True)
    snapshot: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(30))
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = created()
    published_at: Mapped[datetime | None] = mapped_column(DateTime)


class PortfolioState(Base):
    __tablename__ = "portfolio_state"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    active_publication_id: Mapped[str | None] = mapped_column(ForeignKey("publications.id"))
    updated_at: Mapped[datetime] = updated()


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"
    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    event_id: Mapped[str | None] = mapped_column(String(36), unique=True)
    event_type: Mapped[str] = mapped_column(String(100))
    occurred_at: Mapped[datetime] = created()
    publication_id: Mapped[str | None] = mapped_column(ForeignKey("publications.id"))
    page_id: Mapped[str | None] = mapped_column(String(36))
    project_id: Mapped[str | None] = mapped_column(String(36))
    tracked_link_id: Mapped[str | None] = mapped_column(String(36))
    target_key: Mapped[str | None] = mapped_column(String(255))
    referrer: Mapped[str | None] = mapped_column(Text)
    device_type: Mapped[str | None] = mapped_column(String(30))
    browser_family: Mapped[str | None] = mapped_column(String(100))
    country_code: Mapped[str | None] = mapped_column(String(2))
    visitor_key: Mapped[str | None] = mapped_column(String(64))
    metadata_json: Mapped[dict | None] = mapped_column("metadata", JSON)


class AuditEvent(Base):
    __tablename__ = "audit_events"
    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(100))
    entity_type: Mapped[str | None] = mapped_column(String(100))
    entity_id: Mapped[str | None] = mapped_column(String(36))
    ip_address: Mapped[str | None] = mapped_column(String(45))
    metadata_json: Mapped[dict | None] = mapped_column("metadata", JSON)
    created_at: Mapped[datetime] = created()
