# Portfolio

Backend Django dinamico para gestionar el contenido del portfolio personal de Francisco Valencia.

El proyecto esta organizado con una separacion por capas:

- `app/domain`: entidades y contratos de repositorios.
- `app/application`: casos de uso.
- `app/adapters`: implementaciones de infraestructura, ahora con ORM de Django.
- `app/interfaces`: vistas web, endpoints JSON y rutas.
- `portfolio_project`: configuracion principal de Django.

## Estado actual

### Django y PostgreSQL

Ya esta creada la estructura minima de Django:

- `manage.py`.
- `portfolio_project/settings.py`.
- `portfolio_project/urls.py`.
- `portfolio_project/wsgi.py`.
- `portfolio_project/asgi.py`.
- `app/apps.py`.
- Registro de la app `app`.

La base de datos esta configurada para PostgreSQL mediante variables de entorno:

- `POSTGRES_DB`.
- `POSTGRES_USER`.
- `POSTGRES_PASSWORD`.
- `POSTGRES_HOST`.
- `POSTGRES_PORT`.

El proyecto carga `.env` desde `settings.py` para facilitar el desarrollo local.

### Modelos creados

Ya existen modelos Django para:

- `Profile`: datos principales del perfil.
- `SocialMedia`: enlaces sociales asociados opcionalmente a un perfil.
- `SkillCategory`: categorias de tecnologias.
- `Skill`: tecnologias con nivel y categoria.
- `Project`: proyectos del portfolio.
- `ProjectSkill`: relacion entre proyectos y skills.
- `ProjectMedia`: imagenes, videos o documentos asociados a proyectos.

Los modelos estan registrados en el admin de Django y tienen una migracion inicial en `app/migrations/0001_initial.py`.

### API con Django REST Framework

La API esta construida con Django REST Framework:

- `ModelSerializer` en `app/interfaces/serializers.py`.
- `ModelViewSet` en `app/interfaces/api_views.py`.
- `DefaultRouter` en `app/interfaces/urls.py`.

Tambien se ha configurado `drf-spectacular` para generar esquema OpenAPI y documentacion interactiva.

URLs de documentacion:

- `GET /api/schema/`
- `GET /api/docs/`
- `GET /api/redoc/`

### Endpoints disponibles

Indice de recursos:

- `GET /api/`

Cada recurso tiene endpoints de listado, creacion, detalle, actualizacion y borrado:

- `GET /api/profiles/`
- `POST /api/profiles/`
- `GET /api/profiles/<id>/`
- `PUT /api/profiles/<id>/`
- `PATCH /api/profiles/<id>/`
- `DELETE /api/profiles/<id>/`

Los mismos metodos estan disponibles para:

- `/api/social-media/`
- `/api/skill-categories/`
- `/api/skills/`
- `/api/projects/`
- `/api/project-skills/`
- `/api/project-media/`

### Docker

El proyecto incluye:

- `Dockerfile` basado en Python 3.11.
- `docker-compose.yml` con PostgreSQL 16 y servicio web Django.
- `.env.example` con las variables necesarias.
- `.env` local de desarrollo.

### Backoffice y usuarios

El backoffice usa el admin nativo de Django:

```text
http://localhost:8000/admin/
```

El superadmin se crea o actualiza desde variables de entorno con:

```bash
python manage.py ensure_superadmin
```

Variables usadas:

- `SUPERADMIN_USERNAME`
- `SUPERADMIN_EMAIL`
- `SUPERADMIN_PASSWORD`

El comando tambien crea el grupo `Administradores`, con permisos sobre los modelos del portfolio. Los administradores deben ser usuarios `is_staff` y pertenecer a ese grupo.

La gestion de usuarios y grupos queda restringida a superusuarios dentro del admin de Django.

## Ejecucion local con Docker

```bash
docker compose -f docker-compose.yml up --build
```

La API quedara disponible en:

```text
http://localhost:8000/api/
```

La documentacion interactiva tipo Swagger quedara disponible en:

```text
http://localhost:8000/api/docs/
```

## Verificacion realizada

Se ha verificado la sintaxis Python con:

```bash
python -m compileall app portfolio_project manage.py
```

`python manage.py check` no se ha podido ejecutar en el entorno actual porque Django no esta instalado localmente. Las dependencias necesarias estan en `requirements.txt`.
