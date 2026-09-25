# Portfolio CMS

Implementación del portfolio y editor descritos en [la biblia](portfolio_project_bible.md).

## Desarrollo

1. Ejecuta `python infra/scripts/create_dev_env.py` para generar `.env` con credenciales locales aleatorias. Para producción, configura tus propios secretos y HTTPS.
2. Ejecuta `docker compose -f compose.yaml -f compose.dev.yaml up --build` para desarrollo con Vite HMR, o `docker compose up --build -d` para el build estático.
3. Aplica las migraciones: `docker compose exec api alembic upgrade head`.
4. Crea el administrador: `docker compose exec api python -m app.cli create-admin`.
5. Abre `http://localhost/backoffice/` para editar y `http://localhost/` para ver la publicación. La portada mostrará un estado inicial hasta que publiques la primera versión.

La web pública lee `/content/current.json` y un snapshot inmutable. El editor guarda borradores en MySQL y publica una nueva versión desde la API.

El editor visual utiliza Puck para el drag and drop, el árbol de bloques, los slots anidados, el historial y los viewports. Un adaptador convierte entre el árbol de Puck y los nodos normalizados de la API; el botón `Guardar y publicar` espera al autosave antes de iniciar la publicación.

El backoffice genera sus tipos desde `apps/backoffice/openapi.json`, usa TanStack Query para el estado remoto y combina React Hook Form, Zod y Radix para formularios y diálogos. `dnd-kit` gestiona las listas ordenables externas al canvas. Analytics usa Recharts y el gestor de assets incorpora Uppy y recorte local de imágenes.

Comandos frontend útiles:

- `npm run generate:api -w @portfolio/backoffice`: regenera los tipos OpenAPI.
- `npm test -w @portfolio/backoffice`: ejecuta las pruebas Vitest y MSW.
- `npm run storybook -w @portfolio/backoffice`: abre el catálogo de componentes en el puerto 6006.
- `npx playwright install chromium` y `npm run test:e2e -w @portfolio/backoffice`: instala el navegador y ejecuta el smoke E2E.

## Producción

- Configura secretos únicos, `APP_ENV=production` y `COOKIE_SECURE=true`.
- Termina TLS/HTTPS delante de este Nginx o monta certificados y una configuración TLS equivalente. No expongas FastAPI, MySQL ni Redis directamente.
- Ejecuta `docker compose up --build -d`, `docker compose exec api alembic upgrade head` y crea el administrador por CLI.
- Conserva copias externas de los volúmenes `mysql_data`, `redis_data`, `storage/assets` y `storage/published` según la política del servidor.

## Organización

- `apps/api`: FastAPI, dominio, persistencia y compilador de publicaciones.
- `apps/web`: web pública React.
- `apps/backoffice`: editor React.
- `packages/renderer`: tipos y renderer compartidos.
- `infra/nginx`: enrutamiento y caché.

## Verificación

`python -m pytest apps/api/tests`, `npm test -w @portfolio/backoffice`, `npm run build`, `npm run build:storybook -w @portfolio/backoffice` y `docker compose build`.

La biblia es la especificación completa. La cobertura implementada y las decisiones de alcance se detallan en [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).
