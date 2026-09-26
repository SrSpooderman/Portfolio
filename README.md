# Portfolio — versión rápida

Primera versión basada en `portfolio-backoffice-spec.md`. El archivo `portfolio_project_bible.md` no estaba disponible al implementar. El proyecto se ejecuta desde la raíz del repositorio.

## Ejecutar

```bash
python3 setup.py
docker compose up --build -d
```

- Web: http://localhost:8080
- Backoffice: http://localhost:8080/admin
- API / OpenAPI: http://localhost:8080/api/docs
- Usuario: `superadmin`. Contraseña: valor de `SUPERADMIN_PASSWORD` en `.env`, generado localmente. No se incluye en Git.

La portada viene publicada con contenido ficticio de ejemplo. Cambia los textos y enlaces antes de compartirla como tu portfolio.

## Editar

En Páginas, abre **Editar diseño**. Puck permite añadir, reordenar, duplicar y eliminar bloques, y editar sus propiedades. **Guardar borrador** conserva el trabajo sin cambiar la web; **Previsualizar** muestra el borrador; **Publicar** guarda y publica. El botón interno de Puck también guarda solamente el borrador.

Sube imágenes en Imágenes, copia su URL e introdúcela en `src` de un bloque Image. La subida admite hasta 10 MB y convierte a WebP. Los ajustes globales se aplican inmediatamente; el contenido de los bloques se modifica por página.

Datos e imágenes persisten en volúmenes Docker. `docker compose down` detiene los servicios conservando los datos. No añadas `-v` si quieres conservarlos. Cambiar la contraseña del `.env` no modifica un administrador ya creado.

## Alcance

React 19, Puck, formularios React Hook Form + Zod, cliente openapi-fetch, FastAPI, PostgreSQL y Nginx. API privada con cookie HTTP-only y contraseña con scrypt. Solo el proxy expone un puerto. Renderer independiente del editor en `frontend/src/renderer.jsx`.

Incluye dashboard, creación/eliminación de páginas, editor de nueve bloques, borrador/publicación, biblioteca de imágenes y configuración básica. En esta versión rápida el renderer es un módulo local, los documentos se almacenan como JSON serializado y las tablas se inicializan al arrancar.

Pendiente de la especificación completa: migraciones versionadas, JSONB, paquete `@portfolio/renderer`, Uppy y recorte, cambio de slug/título desde la interfaz, cuenta/cambio de contraseña, límite de intentos de login, configuración de redes/logo/favicon, formularios con diálogos Radix y tipos generados desde OpenAPI. No incluye galería, columnas ni experiencia como bloques específicos. Los cambios de configuración global no tienen borrador.

## Servidor público

Configura dominio y TLS en el proxy de tu servidor; ajusta `PUBLIC_URL` al origen exacto y `COOKIE_SECURE=true` con HTTPS. Cambia el puerto con `PORT`. Haz copias de los volúmenes `database` y `media`. Esta entrega está preparada y probada para ejecución local; no incorpora certificados ni despliegue a un proveedor.

## Verificación

```bash
cd frontend
npm ci
npm run build
cd ..
python3 smoke_test.py
```

El smoke test usa el servidor levantado y las credenciales locales, crea una página temporal, comprueba autenticación, borrador/publicación y limpieza. El test no modifica la portada.

## Secciones reutilizables

En **Secciones → Crear sección** puedes diseñar una composición desde cero con grids, contenedores y elementos, cambiar su nombre, previsualizarla y guardarla. El listado permite editar, duplicar o eliminar secciones. Usa **Secciones** dentro del editor de páginas para insertar una copia o guardar el bloque seleccionado. Las copias son independientes: editar o eliminar una plantilla no modifica páginas existentes. Los componentes guardados previamente aparecen en esta misma biblioteca.

La categoría «Secciones iniciales» se ha retirado del catálogo. Los bloques antiguos se conservan por compatibilidad con las páginas existentes y pueden descomponerse para editarlos. La ilustración orbital se ha retirado tanto del Hero como del catálogo y del renderizado de documentos antiguos.

## Estructura

- `frontend/`: React, editor visual y renderer.
- `backend/`: FastAPI y contenido inicial.
- `nginx/`: configuración del proxy.
- `docker-compose.yml`, `.env`, `setup.py` y `smoke_test.py`: ejecución desde la raíz.

Compose conserva el nombre `mvp` para reutilizar los volúmenes existentes de base de datos e imágenes.
