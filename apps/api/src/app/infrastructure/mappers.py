import copy

from app.domain.entities import EditorDocument, EditorNode, PortfolioProject
from app.infrastructure.orm_models import Document, Node, Project


class NodeMapper:
    @staticmethod
    def to_domain(model: Node) -> EditorNode:
        return EditorNode(id=model.id, document_id=model.document_id, parent_id=model.parent_id, node_type=model.node_type, position=model.position, props=copy.deepcopy(model.props or {}), layout=copy.deepcopy(model.layout or {}), style_overrides=copy.deepcopy(model.style_overrides or {}), analytics_key=model.analytics_key)


class DocumentMapper:
    @staticmethod
    def to_domain(model: Document) -> EditorDocument:
        return EditorDocument(id=model.id, document_type=model.document_type, name=model.name, revision=model.revision)


class ProjectMapper:
    @staticmethod
    def to_domain(model: Project) -> PortfolioProject:
        return PortfolioProject(id=model.id, slug=model.slug, title=model.title, summary=model.summary, status=model.status, position=model.position)
