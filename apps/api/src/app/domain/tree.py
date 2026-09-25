"""Tree invariants shared by editor writes and publication validation."""

NODE_TYPES = {
    "SECTION", "CONTAINER", "GRID", "FLEX", "COLUMNS", "STACK", "SPACER",
    "HEADING", "TEXT", "IMAGE", "VIDEO", "BUTTON", "LINK", "ICON",
    "PROJECT", "PROJECT_LIST", "PROJECT_CARD", "STATS", "CODE", "SOCIAL_LINKS",
    "COMPONENT_INSTANCE",
}
LAYOUT_TYPES = {"SECTION", "CONTAINER", "GRID", "FLEX", "COLUMNS", "STACK"}


def validate_tree(nodes: list[dict]) -> list[dict]:
    errors: list[dict] = []
    by_id = {node["id"]: node for node in nodes}
    if len(by_id) != len(nodes):
        errors.append({"code": "DUPLICATE_NODE_ID"})
    for node in nodes:
        if node["node_type"] not in NODE_TYPES:
            errors.append({"code": "UNKNOWN_NODE_TYPE", "node_id": node["id"]})
        parent_id = node.get("parent_id")
        if parent_id and parent_id not in by_id:
            errors.append({"code": "INVALID_NODE_TREE", "node_id": node["id"]})
        if parent_id and parent_id in by_id and by_id[parent_id]["node_type"] not in LAYOUT_TYPES:
            errors.append({"code": "INVALID_PARENT_TYPE", "node_id": node["id"]})
        seen = {node["id"]}
        current = parent_id
        while current in by_id:
            if current in seen:
                errors.append({"code": "INVALID_NODE_TREE", "node_id": node["id"]})
                break
            seen.add(current)
            current = by_id[current].get("parent_id")
    return errors


def subtree_ids(nodes: list[dict], root_id: str) -> list[str]:
    children: dict[str, list[str]] = {}
    for node in nodes:
        if node.get("parent_id"):
            children.setdefault(node["parent_id"], []).append(node["id"])
    result = []
    pending = [root_id]
    while pending:
        current = pending.pop()
        result.append(current)
        pending.extend(children.get(current, []))
    return result
