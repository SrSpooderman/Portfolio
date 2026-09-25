# Estado de implementación

`portfolio_project_bible.md` es la especificación de referencia. El alcance inicial descrito en ella está implementado y es ejecutable como monorepo.

## Producto

- Web pública React que solo consume snapshots inmutables y sigue sirviendo contenido si FastAPI, MySQL o Redis dejan de estar disponibles.
- Backoffice visual integrado con Puck 0.23 para drag and drop, slots anidados, árbol, historial y viewports; un adaptador reversible conserva el árbol normalizado, las clases, los estilos y las referencias del dominio.
- Autosave transaccional del árbol de Puck con revisión optimista, resolución de conflictos y publicación posterior al guardado; Puck gestiona undo/redo de contenido y operaciones estructurales.
- Bloques de layout y contenido del catálogo, inspector guiado, estilos responsive, estados hover/focus, múltiples clases, tokens y overrides por nodo.
- Componentes vivos con prevención de ciclos, overrides de props/estilos/clases, edición desde el canvas y detach; templates como copias independientes.
- Import/export versionado de páginas, componentes y templates con remapeo de clases, reglas, tokens, assets y archivos físicos.
- CRUD administrativo de páginas, proyectos, tecnologías, assets, enlaces trackeados, estilos, tokens, componentes, templates, sesiones y auditoría.
- Cliente OpenAPI tipado, caché e invalidación con TanStack Query, formularios Zod, diálogos Radix y ordenación externa al canvas con dnd-kit.
- Gestor de assets con subida múltiple, progreso, reintentos y recorte WebP; dashboard analytics con gráficos responsive.

## Backend y datos

- FastAPI, MySQL, Redis, SQLAlchemy y Alembic con esquema completo y tres migraciones reproducibles desde una base vacía.
- Login Argon2id, JWT corto, refresh token HttpOnly rotatorio, revocación individual/global, cambio de contraseña y rate limiting Redis.
- Problem Details consistente, request ID, logs JSON sin cuerpos ni credenciales y health checks de MySQL, Redis y filesystem.
- Entidades de dominio sin dependencias de framework, validadores puros, repositorio/mappers del editor y puertos con adaptadores para Redis y snapshots locales. Las consultas agregadas de analytics permanecen como read models SQL.
- Validación de referencias y dependencias al escribir y publicar, bloqueo de revisión en MySQL y asignación serializada de versiones.
- Assets con límite, SHA-256, deduplicación, validación de contenido y dimensiones, metadata y protección contra borrado mientras existan referencias.

## Publicación y analytics

- Compilación determinista de páginas, componentes, estilos, tokens, proyectos, tecnologías, enlaces y assets.
- Validación previa con errores/warnings, snapshots `vN-hash.json`, escritura atómica, `current.json`, reconciliación y rollback sin recompilar.
- Eventos públicos idempotentes, clasificación aproximada de bots/dispositivo/navegador, visitor key diaria, referrer sin query string, Redis hot counters y MySQL como fuente de verdad.
- `/go/{slug}` validado, cacheado, limitado y auditado; panel con filtros, series, interacciones, proyectos, referrers, dispositivos, navegadores y funnel.

## Infraestructura y verificación

- Docker Compose de desarrollo y producción, builds multietapa, Nginx, caché inmutable, límite de upload, CSP y cabeceras de seguridad.
- CI para `pytest`, TypeScript, builds Vite y Storybook, catálogo con addon de accesibilidad y smoke E2E con Playwright.
- 10 pruebas backend cubren dominio, autenticación/rotación, auditoría, analytics, conflictos, componentes, ciclos, undo estructural, publicación/rollback, recursos e import/export portable. Tres pruebas frontend verifican la conversión bidireccional, el montaje real de Puck y el cliente autenticado con MSW.
- Verificado con `pytest`, `npm run build`, migración limpia SQLite y migración real MySQL; Nginx y `/health/ready` pasan dentro del stack Docker.

## Preparado para el despliegue

El dominio, certificados TLS, secretos de producción, contenido real y política externa de copias se configuran en el servidor de destino. La biblia deja fuera del alcance inicial microservicios, Kubernetes, staging, workers y backups automatizados; la estructura mantiene puntos de extensión para incorporarlos después.
