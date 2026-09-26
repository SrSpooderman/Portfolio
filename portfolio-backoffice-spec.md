# Proyecto: Portfolio editable con backoffice

## Objetivo

Crear una aplicación de portfolio personal/profesional que pueda editarse completamente desde un backoffice, sin necesidad de modificar código para cambiar el contenido de la web.

La idea es que el administrador pueda entrar al backoffice y editar el portfolio de forma visual, similar a un pequeño CMS o constructor web:

- añadir secciones
- eliminar secciones
- reordenarlas mediante drag & drop
- editar textos
- añadir imágenes
- modificar propiedades de cada bloque
- previsualizar los cambios
- publicar los cambios

El portfolio público debe renderizar el contenido configurado desde el backoffice.

---

## Stack

### Frontend

React 19.

Dependencias principales disponibles:

- `@puckeditor/core`
- `@dnd-kit/react`
- `@dnd-kit/helpers`
- `@hookform/resolvers`
- `react-hook-form`
- `zod`
- `@tanstack/react-query`
- `openapi-fetch`
- `@uppy/core`
- `@uppy/dashboard`
- `@uppy/react`
- `@uppy/xhr-upload`
- `react-image-crop`
- `@radix-ui/react-dialog`
- `@radix-ui/react-alert-dialog`
- `lucide-react`
- `recharts`
- `@portfolio/renderer`

Usar estas librerías siempre que tenga sentido antes de añadir dependencias nuevas.

---

## Backend

Backend desarrollado con FastAPI.

Debe proporcionar una API REST para:

- autenticación
- gestión del usuario administrador
- configuración del portfolio
- páginas
- bloques/secciones
- assets e imágenes
- publicación del portfolio

La API debe documentarse mediante OpenAPI.

El frontend debe consumirla utilizando `openapi-fetch`.

---

## Arquitectura

La aplicación tendrá tres partes principales:

```text
Internet
   |
Reverse Proxy
   |
   +-- /                -> Portfolio público
   |
   +-- /admin           -> Backoffice
   |
   +-- /api             -> FastAPI
   |
   +-- /media           -> Archivos subidos
```

Todo el proyecto debe poder ejecutarse mediante Docker.

Utilizar `docker compose` para levantar todos los servicios.

Como reverse proxy puede utilizarse Nginx.

Ejemplo conceptual:

```text
nginx
 |
 +-- frontend
 |
 +-- backend (FastAPI)
 |
 +-- media
```

No exponer directamente FastAPI a Internet.

---

## Autenticación

Inicialmente sólo necesitamos administración.

Debe existir al menos un usuario:

`superadmin`

El superadmin tendrá acceso completo al backoffice.

No es necesario crear por ahora un sistema complejo de roles y permisos, pero la arquitectura debería permitir añadir roles posteriormente.

La contraseña debe almacenarse utilizando hashing seguro.

La autenticación puede utilizar access token mediante cookie HTTP-only o un sistema equivalente seguro.

Las rutas `/admin` y las operaciones privadas de `/api` deben estar protegidas.

---

## Portfolio

El portfolio debe estar basado en páginas y bloques.

Ejemplo:

```text
Portfolio
 ├── Home
 │    ├── Hero
 │    ├── About
 │    ├── Projects
 │    ├── Skills
 │    ├── Experience
 │    └── Contact
 │
 └── Projects
      └── ...
```

Cada página tendrá una estructura JSON que describa sus bloques.

Ejemplo conceptual:

```json
{
  "page": "home",
  "blocks": [
    {
      "type": "hero",
      "props": {
        "title": "Hola, soy ...",
        "subtitle": "Developer",
        "image": "/media/profile.webp"
      }
    },
    {
      "type": "projects",
      "props": {
        "title": "Proyectos destacados"
      }
    }
  ]
}
```

El frontend público debe utilizar `@portfolio/renderer` para transformar esta configuración en componentes React.

---

## Componentes editables

Crear inicialmente un conjunto reducido de componentes.

Por ejemplo:

- Hero
- Texto
- Imagen
- Galería
- About
- Projects
- ProjectCard
- Skills
- Experience
- Contact
- Spacer
- Columns
- CTA

No intentar construir desde el principio un editor completamente libre tipo Webflow.

Debe ser un editor basado en componentes definidos por nosotros.

Cada componente tendrá:

```text
type
props
editor schema
renderer
```

Ejemplo:

```text
Hero
 ├── title
 ├── subtitle
 ├── description
 ├── image
 ├── primaryButton
 └── secondaryButton
```

---

## Editor visual

Utilizar `@puckeditor/core` como base del editor visual siempre que encaje con la arquitectura.

Debe permitir:

- añadir componentes
- seleccionar componentes
- modificar propiedades
- duplicar componentes
- eliminar componentes
- reordenar componentes
- previsualizar resultado

Para drag & drop adicional puede utilizarse `dnd-kit`.

No implementar funcionalidades duplicadas si Puck ya las proporciona.

---

## Formularios

Los formularios del backoffice deben utilizar:

- `react-hook-form`
- `zod`
- `@hookform/resolvers`

La validación debe existir tanto en frontend como en backend.

---

## Gestión de imágenes

Las imágenes deben poder subirse desde el backoffice.

Utilizar Uppy.

Flujo:

```text
Seleccionar imagen
      ↓
Preview
      ↓
Crop opcional
      ↓
Upload
      ↓
FastAPI
      ↓
/media/
```

Utilizar `react-image-crop` para permitir recortes cuando sea necesario.

El backend debe devolver información del asset:

```json
{
  "id": "...",
  "url": "/media/...",
  "filename": "...",
  "width": 1200,
  "height": 800
}
```

---

## Publicación

Separar el concepto de:

- borrador
- publicado

El administrador puede editar la versión de trabajo sin modificar inmediatamente la web pública.

Flujo:

```text
Editar
  ↓
Guardar borrador
  ↓
Preview
  ↓
Publicar
  ↓
Portfolio público actualizado
```

No es necesario implementar inicialmente versionado complejo.

Sería suficiente conservar:

- `draft_content`
- `published_content`
- `updated_at`
- `published_at`

---

## Base de datos

Usar PostgreSQL.

Entidades iniciales aproximadas:

```text
users
pages
assets
site_settings
```

Una página puede almacenar su composición principalmente como JSON/JSONB.

Ejemplo:

```text
pages

id
slug
title
draft_content JSONB
published_content JSONB
created_at
updated_at
published_at
```

Esto evita crear tablas específicas para cada componente del editor.

---

## Configuración general

Desde el backoffice también debe poder editarse configuración global del portfolio:

- nombre
- profesión
- descripción
- logo
- favicon
- email
- redes sociales
- SEO básico
- título de la web
- meta description

Guardar esta información en `site_settings`.

---

## Backoffice

Estructura aproximada:

```text
/admin

Dashboard
Pages
Media
Settings
Account
```

### Dashboard

Mostrar información básica:

- última modificación
- páginas existentes
- estado de publicación
- número de imágenes
- acceso rápido a editar portfolio

No necesitamos inicialmente un dashboard complejo.

### Pages

Listado de páginas.

Acciones:

- crear
- editar
- eliminar
- cambiar slug
- publicar

Al entrar en una página se abre el editor visual.

### Media

Pequeña biblioteca multimedia.

Debe permitir:

- subir imagen
- ver imágenes
- seleccionar imagen
- eliminar imagen

### Settings

Configuración global del portfolio.

---

## UI

El backoffice debe ser limpio y sencillo.

Usar Radix UI para dialogs y alert dialogs.

Usar `lucide-react` para iconos.

Evitar crear un design system complejo inicialmente.

Priorizar funcionalidad y buena estructura.

---

## API orientativa

Endpoints aproximados:

```text
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/pages
POST   /api/pages
GET    /api/pages/{id}
PATCH  /api/pages/{id}
DELETE /api/pages/{id}

POST   /api/pages/{id}/publish

GET    /api/assets
POST   /api/assets
DELETE /api/assets/{id}

GET    /api/settings
PATCH  /api/settings

GET    /api/public/site
GET    /api/public/pages/{slug}
```

Los endpoints `/public/*` no requieren autenticación.

El resto sí.

---

## Docker

Crear un único `docker-compose.yml` para desarrollo/producción inicial.

Servicios aproximados:

```yaml
services:
  proxy:
  frontend:
  backend:
  postgres:
```

Opcionalmente los assets pueden almacenarse inicialmente en un volumen Docker.

Ejemplo conceptual:

```text
portfolio_media:/app/media
```

Preparar la arquitectura para poder sustituir posteriormente el almacenamiento local por S3 o compatible sin tener que modificar todo el sistema.

---

## Reverse proxy

Configurar Nginx como punto de entrada.

Rutas:

```text
/           -> frontend
/admin      -> frontend
/api        -> backend
/media      -> media
```

Configurar correctamente headers como:

```text
X-Forwarded-For
X-Forwarded-Proto
X-Real-IP
Host
```

El sistema debe funcionar correctamente detrás del proxy.

---

## Variables de entorno

Como mínimo:

```env
DATABASE_URL=
SECRET_KEY=
SUPERADMIN_EMAIL=
SUPERADMIN_PASSWORD=
MEDIA_PATH=
PUBLIC_URL=
```

No introducir secretos directamente en el repositorio.

---

## Inicialización

Al arrancar el backend por primera vez:

1. ejecutar migraciones
2. comprobar si existe el superadmin
3. si no existe, crearlo usando las variables de entorno
4. arrancar FastAPI

---

## Prioridades

La primera versión debe centrarse en:

1. Docker funcionando.
2. Reverse proxy funcionando.
3. FastAPI conectado a PostgreSQL.
4. Autenticación superadmin.
5. Backoffice protegido.
6. CRUD de páginas.
7. Editor visual.
8. Guardado del JSON del editor.
9. Renderer del portfolio público.
10. Upload de imágenes.
11. Draft / Publish.
12. Configuración global.

Evitar añadir funcionalidades que no sean necesarias para este MVP.

---

## Criterio principal de arquitectura

Mantener separados:

```text
Editor
   ↓
JSON de página
   ↓
API / Database
   ↓
Renderer
   ↓
Portfolio público
```

El editor nunca debe ser responsable directamente de cómo se almacena la información.

El renderer no debe depender del backoffice.

El JSON almacenado debe ser suficientemente estable como para poder modificar el editor en el futuro sin romper el portfolio público.

---

## Objetivo final

El resultado debe permitir que una persona sin tocar código pueda entrar en:

`/admin`

editar visualmente su portfolio, subir fotografías, modificar textos, ordenar bloques y publicar los cambios.

La web pública debe reflejar únicamente la última versión publicada.

Priorizar una arquitectura sencilla, mantenible y extensible frente a añadir funcionalidades innecesarias.
