"""Transactional, idempotent initialization and conversion of stored content."""
import hashlib
import json
from pathlib import Path
from uuid import uuid4
from sqlalchemy import text
from content_migration import migrate_block, migrate_document, populate_starter

PROFILE_FIELDS = ('name', 'profession', 'email', 'title', 'description')
# Recognize only the exact previous demo. Edited content is converted, never replaced.
PREVIOUS_SEED_DIGEST = 'b4dff147b351585be01cec028780ef8bb0612972cffb769ab1839ef7d13be65a'
PREVIOUS_PROFILE_DIGEST = '2350f56f39c527c39f23f668bdd269abbbabfa040ca551ee5b0a119bd9661b36'


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False,
                                     separators=(',', ':')).encode()).hexdigest()


def empty_settings(theme='linen'):
    return {**dict.fromkeys(PROFILE_FIELDS, ''), 'theme': theme, 'setup_completed': False}


def public_settings(value):
    return {**{key: value.get(key, '') for key in PROFILE_FIELDS},
            'theme': value.get('theme', 'linen'),
            'setup_required': not value.get('setup_completed', False)}


def initialize_content(engine, now):
    seed = json.loads(Path(__file__).with_name('seed.json').read_text())
    with engine.begin() as connection:
        connection.execute(text('CREATE TABLE IF NOT EXISTS content_backups '
                                '(key TEXT PRIMARY KEY, content TEXT NOT NULL, created_at TEXT NOT NULL)'))

        def backup(key, content):
            connection.execute(text('INSERT INTO content_backups (key,content,created_at) '
                                    'VALUES (:key,:content,:date) ON CONFLICT (key) DO NOTHING'),
                               dict(key=key, content=content, date=now()))

        row = connection.execute(text('SELECT content FROM settings WHERE id=1')).mappings().first()
        if row is None:
            profile = empty_settings()
            connection.execute(text('INSERT INTO settings (id,content) VALUES (1,:content)'),
                               {'content': json.dumps(profile)})
        else:
            profile = json.loads(row['content'])
            if 'setup_completed' not in profile:
                old_profile = {key: profile.get(key, '') for key in PROFILE_FIELDS}
                is_demo = digest(old_profile) == PREVIOUS_PROFILE_DIGEST
                backup('settings:before-setup', row['content'])
                profile = empty_settings(profile.get('theme', 'linen')) if is_demo else {
                    **profile, 'setup_completed': bool(profile.get('name') and profile.get('email'))}
                connection.execute(text('UPDATE settings SET content=:content WHERE id=1'),
                                   {'content': json.dumps(profile)})

        pages = connection.execute(text('SELECT id,slug,draft,published FROM pages')).mappings().all()
        if not pages:
            initial = populate_starter(seed, profile) if profile['setup_completed'] else seed
            published = json.dumps(initial) if profile['setup_completed'] else None
            connection.execute(text('INSERT INTO pages '
                                    '(id,slug,title,draft,published,updated_at,published_at) '
                                    'VALUES (:id,\'home\',\'Inicio\',:draft,:published,:date,:published_at)'),
                               dict(id=uuid4().hex, draft=json.dumps(initial), published=published,
                                    date=now(), published_at=now() if published else None))
        for page in pages:
            for field in ('draft', 'published'):
                raw = page[field]
                if not raw:
                    continue
                old = json.loads(raw)
                is_demo = page['slug'] == 'home' and digest(old) == PREVIOUS_SEED_DIGEST
                if is_demo:
                    updated = populate_starter(seed, profile) if profile['setup_completed'] else seed
                else:
                    updated = migrate_document(old)
                if updated != old:
                    backup(f"page:{page['id']}:{field}:primitives-v1", raw)
                    # Identifiers in this SQL come exclusively from the fixed field tuple above.
                    connection.execute(text(f'UPDATE pages SET {field}=:content WHERE id=:id'),
                                       {'id': page['id'], 'content': json.dumps(updated)})
        for item in connection.execute(text('SELECT id,content FROM components')).mappings().all():
            old = json.loads(item['content'])
            updated = migrate_block(old)
            if updated != old:
                backup(f"component:{item['id']}:primitives-v1", item['content'])
                connection.execute(text('UPDATE components SET content=:content WHERE id=:id'),
                                   {'id': item['id'], 'content': json.dumps(updated)})
