import json
import os
import tempfile
from pathlib import Path


class LocalSnapshotStorage:
    def __init__(self, root: Path):
        self.root = root

    def path(self, name: str) -> Path:
        if Path(name).name != name:
            raise ValueError("Snapshot names cannot contain paths")
        return self.root / name

    def exists(self, name: str) -> bool:
        return self.path(name).is_file()

    def read(self, name: str) -> dict:
        return json.loads(self.path(name).read_text(encoding="utf-8"))

    def write(self, name: str, payload: dict) -> None:
        path = self.path(name)
        path.parent.mkdir(parents=True, exist_ok=True)
        fd, temporary = tempfile.mkstemp(prefix=".publication-", suffix=".tmp", dir=path.parent)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                json.dump(payload, handle, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, path)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
