"""Infrastructure-free entities used by domain services and repository ports."""

from dataclasses import dataclass, field
from decimal import Decimal


@dataclass(frozen=True, slots=True)
class EditorNode:
    id: str
    document_id: str
    parent_id: str | None
    node_type: str
    position: Decimal
    props: dict = field(default_factory=dict)
    layout: dict = field(default_factory=dict)
    style_overrides: dict = field(default_factory=dict)
    analytics_key: str | None = None


@dataclass(frozen=True, slots=True)
class EditorDocument:
    id: str
    document_type: str
    name: str
    revision: int


@dataclass(frozen=True, slots=True)
class PortfolioProject:
    id: str
    slug: str
    title: str
    summary: str
    status: str
    position: Decimal
