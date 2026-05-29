# WebWeaver

WebWeaver es un backend Django dinamico para gestionar un portfolio personal reutilizable. La idea es que cualquier persona pueda descargar el proyecto, levantarlo y editar su contenido desde el backoffice de Django sin tocar templates ni codigo.

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

- `SiteSettings`: identidad de la web, SEO, titulos de secciones, etiquetas y mensajes vacios.
- `VisualTheme`: temas visuales reutilizables con colores, fuente, ancho de contenido y radio de tarjetas.
- `NavigationItem`: enlaces de navegacion del portfolio publico.
- `Profile`: datos principales del perfil.
- `SocialMedia`: enlaces sociales asociados opcionalmente a un perfil.
- `SkillCategory`: categorias de tecnologias.
- `Skill`: tecnologias con nivel y categoria.
- `LearningItem`: elementos de aprendizaje, formacion o foco actual.
- `Project`: proyectos del portfolio.
- `ProjectSkill`: relacion entre proyectos y skills.
- `ProjectMedia`: imagenes, videos o documentos asociados a proyectos.

La marca por defecto usa el logo ubicado en:

```text
assets/img/brand/webweaberLogo.svg
```

Desde `Config site` se pueden editar `logo_path`, `favicon_path` y el tema visual activo. Los temas se gestionan
desde `Visual themes` y permiten crear tantas variantes visuales como haga falta sin tocar CSS.

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

- `GET /api/site-settings/`
- `POST /api/site-settings/`
- `GET /api/site-settings/<id>/`
- `PUT /api/site-settings/<id>/`
- `PATCH /api/site-settings/<id>/`
- `DELETE /api/site-settings/<id>/`

Los mismos metodos estan disponibles para:

- `/api/navigation/`
- `GET /api/profiles/`
- `POST /api/profiles/`
- `GET /api/profiles/<id>/`
- `PUT /api/profiles/<id>/`
- `PATCH /api/profiles/<id>/`
- `DELETE /api/profiles/<id>/`

- `/api/social-media/`
- `/api/visual-themes/`
- `/api/skill-categories/`
- `/api/skills/`
- `/api/learning/`
- `/api/projects/`
- `/api/project-skills/`
- `/api/project-media/`

Los listados estan paginados con `page` y usan `API_PAGE_SIZE` como tamano de pagina configurable
por entorno, con valor por defecto `20`.

Filtros disponibles:

- `GET /api/projects/?featured=true`: proyectos destacados.
- `GET /api/projects/?featured=false`: proyectos no destacados.
- `GET /api/skills/?category=<id>`: skills de una categoria.
- `GET /api/skills/?category_name=<nombre>`: skills por nombre exacto de categoria.
- `GET /api/project-media/?project=<id>`: media de un proyecto.
- `GET /api/project-media/?project_slug=<slug>`: media por slug de proyecto.

La lectura de la API es publica. Los endpoints de escritura (`POST`, `PUT`, `PATCH`, `DELETE`)
requieren usuario autenticado mediante sesion de Django o basic auth. La browsable API expone login
en `/api/auth/login/`.

### Frontend publico

Django renderiza el portfolio publico con templates:

- `GET /`: pagina principal del portfolio.
- `GET /projects/<slug>/`: detalle publico de proyecto.

La pagina principal muestra datos dinamicos desde la base de datos:

- Configuracion global del sitio.
- Tema visual activo: colores, fuente, ancho de contenido y radios.
- Navegacion.
- Perfil.
- Bio.
- Skills agrupadas por categoria.
- Aprendizaje.
- Proyectos.
- Enlaces sociales.
- CV si esta cargado en el perfil.

Los estilos estan en `assets/css/styles.css` y se sirven mediante `{% static %}`.

### Docker

El proyecto incluye:

- `Dockerfile` basado en Python 3.11.
- `docker-compose.yml` con PostgreSQL 16 y servicio web Django.
- `.env.example` con las variables necesarias.
- `.env` local de desarrollo.

### Backoffice y usuarios

El proyecto incluye un backoffice propio con login:

```text
http://localhost:8000/backoffice/
```

Pantallas principales:

- `Dashboard`: resumen de contenido.
- `Config site`: identidad, SEO, titulos, etiquetas y mensajes globales.
- `Visual themes`: colores, fuente, ancho de contenido y radios reutilizables.
- `Profiles`: perfil principal.
- `Navigation`: enlaces de cabecera.
- `Projects`, `Project skills`, `Project media`: proyectos y contenido asociado.
- `Skill categories` y `Skills`: tecnologias.
- `Learning`: aprendizaje, formacion o foco actual.
- `Social media`: enlaces externos.
- `Administrators`: gestion de administradores, solo visible para superusuarios.

Tambien se mantiene el admin nativo de Django para tareas internas:

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

La gestion de administradores desde el backoffice queda restringida a superusuarios.

Para adaptar el portfolio a otra persona, entra en el backoffice y edita:

- `Config site`: nombre del sitio, propietario, titular, SEO, titulos de secciones, etiquetas y tema activo.
- `Visual themes`: paletas y tokens visuales para crear multiples apariencias reutilizables.
- `Navigation`: enlaces visibles en la cabecera.
- `Profiles`: datos personales, bio, contacto y CV.
- `Skill categories` y `Skills`: tecnologias.
- `Learning`: aprendizaje actual, formacion o intereses.
- `Projects`, `Project skills` y `Project media`: proyectos y contenido asociado.
- `Social media`: enlaces externos.

## Ejecucion local con Docker

```bash
docker compose -f docker-compose.yml up --build
```

La API quedara disponible en:

```text
http://localhost:8000/api/
```

El backoffice quedara disponible en:

```text
http://localhost:8000/backoffice/
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
