from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.entities import EditorNode
from app.domain.tree import subtree_ids
from app.infrastructure.mappers import NodeMapper
from app.infrastructure.orm_models import Node


class SQLAlchemyNodeRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_model(self, node_id: str) -> Node | None:
        return self.session.get(Node, node_id)

    def get_document_node_models(self, document_id: str) -> list[Node]:
        return list(self.session.scalars(select(Node).where(Node.document_id == document_id).order_by(Node.position, Node.id)))

    def get(self, node_id: str) -> EditorNode | None:
        model = self.get_model(node_id)
        return NodeMapper.to_domain(model) if model else None

    def get_document_nodes(self, document_id: str) -> list[EditorNode]:
        return [NodeMapper.to_domain(model) for model in self.get_document_node_models(document_id)]

    def get_subtree(self, node_id: str) -> list[EditorNode]:
        model = self.get_model(node_id)
        if model is None:
            return []
        nodes = self.get_document_node_models(model.document_id)
        selected = set(subtree_ids([{"id": item.id, "parent_id": item.parent_id} for item in nodes], node_id))
        return [NodeMapper.to_domain(item) for item in nodes if item.id in selected]
