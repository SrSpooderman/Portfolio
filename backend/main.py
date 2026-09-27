from typing import Literal
import os, secrets, hashlib, hmac, io, uuid
from datetime import datetime, timezone
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, Response, Depends, UploadFile
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import create_engine, text
from itsdangerous import URLSafeTimedSerializer, BadSignature
from PIL import Image
import json
from bootstrap import initialize_content, public_settings
from content_migration import BLOCK_TYPES, populate_starter

engine = create_engine(os.getenv('DATABASE_URL', 'sqlite:///./portfolio.db'))
media = Path(os.getenv('MEDIA_PATH', './media')); media.mkdir(parents=True, exist_ok=True)
secret = os.environ['SECRET_KEY']
signer = URLSafeTimedSerializer(secret)
def now(): return datetime.now(timezone.utc).isoformat()
def run(sql, params=None):
    with engine.begin() as c:
        r = c.execute(text(sql), params or {})
        return [dict(x) for x in r.mappings()] if r.returns_rows else []
def password_hash(password, salt): return hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1).hex()
def document(row):
    for key in ('draft', 'published'): row[key] = json.loads(row[key]) if row[key] else None
    return row

@asynccontextmanager
async def lifespan(app):
    for sql in [
        'CREATE TABLE IF NOT EXISTS components (id TEXT PRIMARY KEY, name TEXT NOT NULL, content TEXT NOT NULL, updated_at TEXT NOT NULL)',
        'CREATE TABLE IF NOT EXISTS users (name TEXT PRIMARY KEY, salt TEXT NOT NULL, hash TEXT NOT NULL)',
        'CREATE TABLE IF NOT EXISTS pages (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, draft TEXT NOT NULL, published TEXT, updated_at TEXT, published_at TEXT)',
        'CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY, content TEXT NOT NULL)',
        'CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, url TEXT, filename TEXT, width INTEGER, height INTEGER)',
    ]: run(sql)
    if not run('SELECT name FROM users'):
        password = os.environ['SUPERADMIN_PASSWORD']
        if len(password) < 12: raise RuntimeError('SUPERADMIN_PASSWORD necesita al menos 12 caracteres')
        salt = secrets.token_hex(16)
        run('INSERT INTO users VALUES (:name,:salt,:hash)', dict(name='superadmin', salt=salt, hash=password_hash(password,salt)))
    initialize_content(engine, now)
    yield
app = FastAPI(title='SpiderPortfolio', lifespan=lifespan, docs_url='/api/docs', openapi_url='/api/openapi.json')
app.mount('/media', StaticFiles(directory=media), name='media')

@app.middleware('http')
async def same_origin(request, call_next):
    if request.method not in ('GET','HEAD','OPTIONS'):
        origin = request.headers.get('origin')
        allowed = os.getenv('PUBLIC_URL', 'http://localhost:8080').rstrip('/')
        if origin and origin != allowed: return Response('Origen no permitido', status_code=403)
    response = await call_next(request)
    if request.url.path.startswith('/api'): response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response

def admin(request: Request):
    try:
        if signer.loads(request.cookies.get('session',''), max_age=28800) != 'superadmin': raise BadSignature('user')
    except BadSignature: raise HTTPException(401, 'Inicia sesión')

class Login(BaseModel):
    username: str
    password: str = Field(max_length=256)
@app.post('/api/auth/login')
def login(body: Login, response: Response):
    user = run('SELECT * FROM users WHERE name=:name', {'name':'superadmin'})[0]
    valid = hmac.compare_digest(password_hash(body.password,user['salt']), user['hash'])
    if body.username != 'superadmin' or not valid: raise HTTPException(401,'Credenciales incorrectas')
    response.set_cookie('session',signer.dumps('superadmin'),httponly=True,samesite='strict',secure=os.getenv('COOKIE_SECURE')=='true',max_age=28800,path='/')
    return {'name':'superadmin'}
@app.post('/api/auth/logout')
def logout(response: Response):
    response.delete_cookie('session'); return {'ok':True}
@app.get('/api/auth/me',dependencies=[Depends(admin)])
def me(): return {'name':'superadmin'}
def stored_settings(): return json.loads(run('SELECT content FROM settings WHERE id=1')[0]['content'])
@app.get('/api/public/site')
@app.get('/api/settings',dependencies=[Depends(admin)])
def settings(): return public_settings(stored_settings())
class Settings(BaseModel):
    theme: Literal['linen','glacier','graphite','crimson'] = 'linen'
    name: str = Field(min_length=1,max_length=100)
    profession: str = Field(max_length=150)
    email: str = Field(min_length=3,max_length=200,pattern=r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
    title: str = Field(max_length=200)
    description: str = Field(max_length=500)

    @field_validator('name','profession','email','title','description', mode='before')
    @classmethod
    def strip_text(cls, value):
        return value.strip() if isinstance(value, str) else value

@app.patch('/api/settings',dependencies=[Depends(admin)])
def save_settings(body:Settings):
    if not stored_settings().get('setup_completed'):
        raise HTTPException(409, 'Completa la configuración inicial')
    value = {**body.model_dump(), 'setup_completed': True}
    run('UPDATE settings SET content=:content WHERE id=1', {'content':json.dumps(value)})
    return public_settings(value)

@app.post('/api/setup',dependencies=[Depends(admin)])
def complete_setup(body:Settings):
    profile = {**body.model_dump(), 'setup_completed': True}
    profile['title'] = profile['title'] or profile['name']
    with engine.begin() as connection:
        # Compare-and-set makes two simultaneous setup submissions harmless.
        raw = connection.execute(text('SELECT content FROM settings WHERE id=1')).scalar_one()
        if json.loads(raw).get('setup_completed'):
            raise HTTPException(409, 'La configuración inicial ya está completada')
        changed = connection.execute(text('UPDATE settings SET content=:content WHERE id=1 AND content=:old'),
                                     {'content':json.dumps(profile), 'old':raw})
        if changed.rowcount != 1:
            raise HTTPException(409, 'La configuración inicial ya está completada')
        home = connection.execute(text("SELECT id,draft FROM pages WHERE slug='home'")).mappings().first()
        if home:
            draft = json.loads(home['draft'])
            if draft.get('root', {}).get('props', {}).get('starter'):
                content = json.dumps(populate_starter(draft, profile))
                connection.execute(text('UPDATE pages SET draft=:content,published=:content,'
                                        'updated_at=:date,published_at=:date WHERE id=:id'),
                                   {'content':content,'date':now(),'id':home['id']})
    return public_settings(profile)

def validate_blocks(blocks):
    ids = set()
    def walk(block, depth=0):
        if depth > 20 or not isinstance(block, dict) or block.get('type') not in BLOCK_TYPES or not isinstance(block.get('props'), dict):
            raise HTTPException(422, 'Estructura de bloque no válida')
        props = block['props']
        id = props.get('id')
        if not isinstance(id, str) or not id or id in ids:
            raise HTTPException(422, 'Identificadores de bloque no válidos')
        ids.add(id)
        if block['type'] in ('Grid', 'Container', 'Section'):
            children = props.get('content', [])
            if not isinstance(children, list): raise HTTPException(422, 'El contenido debe ser una lista')
            for child in children: walk(child, depth + 1)
    for block in blocks: walk(block)

def linked_instance(content, current, component_id, component_name):
    clone = json.loads(json.dumps(content))
    current_props = current.get('props', {})
    root_props = clone.setdefault('props', {})
    root_props['id'] = current_props.get('id', root_props.get('id', f"{clone.get('type','Section')}-{uuid.uuid4()}"))
    for key in ('placement', 'mobile', 'anchor'):
        if key in current_props: root_props[key] = current_props[key]
    root_props['linked'] = True
    root_props['libraryId'] = component_id
    root_props['libraryName'] = component_name
    def refresh_children(block):
        props = block.get('props', {})
        for child in props.get('content', []) or []:
            child_props = child.setdefault('props', {})
            child_props['id'] = f"{child.get('type','Block')}-{uuid.uuid4()}"
            refresh_children(child)
    refresh_children(clone)
    return clone

def update_linked_instances(document, component_id, component_name, content):
    changed = False
    def walk(items):
        nonlocal changed
        next_items = []
        for item in items:
            props = item.get('props', {})
            if props.get('linked') and props.get('libraryId') == component_id:
                changed = True
                next_items.append(linked_instance(content, item, component_id, component_name))
                continue
            if item.get('type') in ('Grid', 'Container', 'Section') and isinstance(props.get('content'), list):
                children = walk(props.get('content', []))
                if children is not props.get('content'):
                    item = {**item, 'props': {**props, 'content': children}}
            next_items.append(item)
        return next_items
    next_doc = {**document, 'content': walk(document.get('content', []))}
    return next_doc if changed else document

class Page(BaseModel):
    title: str = Field(min_length=1,max_length=100)
    slug: str = Field(pattern=r'^[a-z0-9][a-z0-9-]{0,79}$')
    draft: dict = Field(default_factory=lambda:{'content':[], 'root':{}})
    def validate_content(self):
        if self.slug in ('admin','api','media'): raise HTTPException(422,'Slug reservado')
        if not isinstance(self.draft.get('content'),list) or len(json.dumps(self.draft))>1000000: raise HTTPException(422,'Contenido no válido')
        validate_blocks(self.draft['content'])
def get_page(id):
    rows=run('SELECT * FROM pages WHERE id=:id',{'id':id})
    if not rows: raise HTTPException(404,'Página no encontrada')
    return document(rows[0])
@app.get('/api/pages',dependencies=[Depends(admin)])
def pages(): return [document(x) for x in run('SELECT * FROM pages ORDER BY title')]
@app.get('/api/pages/{id}',dependencies=[Depends(admin)])
def page(id:str): return get_page(id)
@app.post('/api/pages',dependencies=[Depends(admin)])
def create_page(body:Page):
    body.validate_content()
    if run('SELECT id FROM pages WHERE slug=:slug',{'slug':body.slug}): raise HTTPException(409,'El slug ya existe')
    id=uuid.uuid4().hex
    run('INSERT INTO pages VALUES (:id,:slug,:title,:draft,NULL,:updated,NULL)',dict(id=id,slug=body.slug,title=body.title,draft=json.dumps(body.draft),updated=now()))
    return get_page(id)
@app.patch('/api/pages/{id}',dependencies=[Depends(admin)])
def update_page(id:str,body:Page):
    old=get_page(id); body.validate_content()
    if old['slug']=='home' and body.slug!='home': raise HTTPException(422,'La portada debe conservar el slug home')
    if run('SELECT id FROM pages WHERE slug=:slug AND id!=:id',{'slug':body.slug,'id':id}): raise HTTPException(409,'El slug ya existe')
    run('UPDATE pages SET slug=:slug,title=:title,draft=:draft,updated_at=:date WHERE id=:id',dict(id=id,slug=body.slug,title=body.title,draft=json.dumps(body.draft),date=now()))
    return get_page(id)
@app.delete('/api/pages/{id}',dependencies=[Depends(admin)])
def delete_page(id:str):
    if get_page(id)['slug']=='home': raise HTTPException(422,'No se puede eliminar la portada')
    run('DELETE FROM pages WHERE id=:id',{'id':id}); return {'ok':True}
@app.post('/api/pages/{id}/publish',dependencies=[Depends(admin)])
def publish(id:str):
    get_page(id); run('UPDATE pages SET published=draft,published_at=:date WHERE id=:id',{'id':id,'date':now()}); return get_page(id)
@app.get('/api/public/pages/{slug}')
def public_page(slug:str):
    if not stored_settings().get('setup_completed'): raise HTTPException(404,'Portfolio pendiente de configuración')
    rows=run('SELECT title,published FROM pages WHERE slug=:slug AND published IS NOT NULL',{'slug':slug})
    if not rows: raise HTTPException(404,'Página no publicada')
    return {'title':rows[0]['title'],'content':json.loads(rows[0]['published'])}
@app.get('/api/assets',dependencies=[Depends(admin)])
def assets(): return run('SELECT * FROM assets')
@app.post('/api/assets',dependencies=[Depends(admin)])
async def upload(file:UploadFile):
    data=await file.read(10*1024*1024+1)
    if len(data)>10*1024*1024: raise HTTPException(413,'Máximo 10 MB')
    try:
        im=Image.open(io.BytesIO(data)); im.load()
        if im.width*im.height>25000000: raise ValueError()
        im.thumbnail((2400,2400)); im=im.convert('RGB')
    except Exception: raise HTTPException(422,'Imagen no válida')
    id=uuid.uuid4().hex; im.save(media/f'{id}.webp','WEBP',quality=85)
    item=dict(id=id,url=f'/media/{id}.webp',filename=(file.filename or 'imagen')[:200],width=im.width,height=im.height)
    run('INSERT INTO assets VALUES (:id,:url,:filename,:width,:height)',item); return item
@app.delete('/api/assets/{id}',dependencies=[Depends(admin)])
def delete_asset(id:str):
    rows=run('SELECT * FROM assets WHERE id=:id',{'id':id})
    if not rows: raise HTTPException(404,'Imagen no encontrada')
    (media/Path(rows[0]['url']).name).unlink(missing_ok=True)
    run('DELETE FROM assets WHERE id=:id',{'id':id}); return {'ok':True}


class ComponentTemplate(BaseModel):
    name: str = Field(min_length=1,max_length=100)
    content: dict
    def validate_tree(self):
        if not self.name.strip(): raise HTTPException(422,'El nombre no puede estar vacío')
        if len(json.dumps(self.content)) > 1000000: raise HTTPException(422,'Componente demasiado grande')
        validate_blocks([self.content])

@app.get('/api/components',dependencies=[Depends(admin)])
def list_components():
    return [{**r,'content':json.loads(r['content'])} for r in run('SELECT * FROM components ORDER BY name')]

@app.post('/api/components',dependencies=[Depends(admin)])
def create_component(body:ComponentTemplate):
    body.validate_tree()
    item=dict(id=uuid.uuid4().hex,name=body.name.strip(),content=json.dumps(body.content),updated_at=now())
    run('INSERT INTO components VALUES (:id,:name,:content,:updated_at)',item)
    return {**item,'content':body.content}

@app.patch('/api/components/{id}',dependencies=[Depends(admin)])
def update_component(id:str,body:ComponentTemplate):
    body.validate_tree()
    name = body.name.strip()
    date = now()
    content = json.dumps(body.content)
    with engine.begin() as connection:
        if not connection.execute(text('SELECT id FROM components WHERE id=:id'), {'id':id}).mappings().first():
            raise HTTPException(404,'Componente no encontrado')
        connection.execute(text('UPDATE components SET name=:name,content=:content,updated_at=:date WHERE id=:id'),
                           dict(id=id,name=name,content=content,date=date))
        for page in connection.execute(text('SELECT id,draft,published FROM pages')).mappings().all():
            updates = {}
            for key in ('draft', 'published'):
                if not page[key]: continue
                current = json.loads(page[key])
                updated = update_linked_instances(current, id, name, body.content)
                if updated != current:
                    validate_blocks(updated.get('content', []))
                    updates[key] = json.dumps(updated)
            if updates:
                params = {'id': page['id'], 'date': date, **updates}
                if 'draft' in updates and 'published' in updates:
                    connection.execute(text('UPDATE pages SET draft=:draft,published=:published,updated_at=:date,published_at=:date WHERE id=:id'), params)
                elif 'draft' in updates:
                    connection.execute(text('UPDATE pages SET draft=:draft,updated_at=:date WHERE id=:id'), params)
                else:
                    connection.execute(text('UPDATE pages SET published=:published,published_at=:date WHERE id=:id'), params)
    return {'id':id,'name':name,'content':body.content}

@app.delete('/api/components/{id}',dependencies=[Depends(admin)])
def delete_component(id:str):
    if not run('SELECT id FROM components WHERE id=:id',{'id':id}): raise HTTPException(404,'Componente no encontrado')
    run('DELETE FROM components WHERE id=:id',{'id':id})
    return {'ok':True}
