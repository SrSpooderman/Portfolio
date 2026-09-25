"""Create local development configuration without putting credentials in Git."""

from pathlib import Path
from secrets import token_urlsafe


root = Path(__file__).resolve().parents[2]
target = root / ".env"
if target.exists():
    raise SystemExit(".env already exists; no changes made")
password = token_urlsafe(24)
root_password = token_urlsafe(24)
content = (root / ".env.example").read_text(encoding="utf-8")
content = content.replace("change-me", password)
content = content.replace("change-root-password", root_password)
content = content.replace("replace-with-a-long-random-secret", token_urlsafe(48))
content = content.replace("replace-with-another-long-random-secret", token_urlsafe(48))
target.write_text(content, encoding="utf-8")
print("Created .env with random development credentials")
