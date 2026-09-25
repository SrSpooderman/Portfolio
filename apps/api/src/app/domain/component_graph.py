"""Pure validation for live component dependency graphs."""


def reaches(edges: dict[str, set[str]], start: str, target: str, seen: set[str] | None = None) -> bool:
    if start == target:
        return True
    visited = set() if seen is None else seen
    if start in visited:
        return False
    visited.add(start)
    return any(reaches(edges, child, target, visited) for child in edges.get(start, set()))


def creates_cycle(edges: dict[str, set[str]], owner: str, referenced: str) -> bool:
    return reaches(edges, referenced, owner)
