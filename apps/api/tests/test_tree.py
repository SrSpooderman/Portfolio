from app.domain.tree import subtree_ids, validate_tree


def test_tree_rejects_cycles_and_invalid_parent_types():
    nodes = [
        {"id": "a", "parent_id": "b", "node_type": "SECTION"},
        {"id": "b", "parent_id": "a", "node_type": "HEADING"},
    ]
    codes = {item["code"] for item in validate_tree(nodes)}
    assert "INVALID_NODE_TREE" in codes
    assert "INVALID_PARENT_TYPE" in codes


def test_subtree_only_contains_descendants():
    nodes = [
        {"id": "a", "parent_id": None},
        {"id": "b", "parent_id": "a"},
        {"id": "c", "parent_id": "b"},
        {"id": "d", "parent_id": None},
    ]
    assert set(subtree_ids(nodes, "a")) == {"a", "b", "c"}
