"""Integration smoke test against a running local stack; preserves the home page."""
import json
import uuid
from pathlib import Path
from urllib.request import Request, build_opener, HTTPCookieProcessor
from urllib.error import HTTPError

env = dict(line.split('=', 1) for line in Path(__file__).with_name('.env').read_text().splitlines() if '=' in line)
base = env.get('PUBLIC_URL', 'http://localhost:8080')
client = build_opener(HTTPCookieProcessor())

def call(path, method='GET', body=None, status=200):
    request = Request(base + path, data=json.dumps(body).encode() if body is not None else None,
                      method=method, headers={'Content-Type': 'application/json', 'Origin': base})
    try:
        response = client.open(request)
    except HTTPError as e:
        response = e
    assert response.status == status, (path, response.status, response.read().decode())
    raw = response.read()
    return json.loads(raw) if raw else None

assert client.open(base).status == 200
assert client.open(base + '/admin').status == 200
call('/api/pages', status=401)
call('/api/auth/login', 'POST', {'username': 'superadmin', 'password': 'incorrect'}, status=401)
call('/api/auth/login', 'POST', {'username': 'superadmin', 'password': env['SUPERADMIN_PASSWORD']})
assert call('/api/auth/me')['name'] == 'superadmin'
assert call('/api/public/pages/home')['content']['content']
slug = 'smoke-' + uuid.uuid4().hex[:10]
draft = {'content': [{'type': 'Text', 'props': {'id': 'smoke', 'title': 'Version A', 'text': 'Integration test'}}], 'root': {}}
page = call('/api/pages', 'POST', {'title': 'Smoke test', 'slug': slug, 'draft': draft})
try:
    call('/api/public/pages/' + slug, status=404)
    call('/api/pages/' + page['id'] + '/publish', 'POST')
    assert call('/api/public/pages/' + slug)['content'] == draft
    draft['content'][0]['props']['title'] = 'Version B'
    call('/api/pages/' + page['id'], 'PATCH', {'title': 'Smoke test', 'slug': slug, 'draft': draft})
    assert call('/api/public/pages/' + slug)['content']['content'][0]['props']['title'] == 'Version A'
    call('/api/pages/' + page['id'] + '/publish', 'POST')
    assert call('/api/public/pages/' + slug)['content'] == draft
    call('/api/pages', 'POST', {'title': 'Duplicate', 'slug': slug}, status=409)
finally:
    call('/api/pages/' + page['id'], 'DELETE')
call('/api/public/pages/' + slug, status=404)
call('/api/auth/logout', 'POST')
call('/api/pages', status=401)
print('PASS: public routes, login/logout, private API, page CRUD, draft isolation and publication.')
