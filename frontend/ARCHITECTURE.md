# Arquitectura de SpiderPortfolio

`src/main.jsx` inicializa el documento y React. `app/App.jsx` carga la configuración y muestra el portfolio, el acceso o el asistente inicial.

## Responsabilidades

- `theme/`: catálogo de cuatro paletas, validación del contrato y aplicación de tokens al documento. `ThemeProvider` comparte únicamente el identificador de paleta.
- `styles/`: fuentes, reset mínimo y orden de capas: `reset`, `vendor`, `puck-tokens`, `primitives`, `content`, `components`, `adapter`.
- `ui/primitives.module.css`: clases explícitas para controles y elementos compartidos. Ningún selector global de botones, inputs o párrafos modifica Puck.
- `features/` y `layouts/`: componentes y módulos CSS de cada función. `features/setup/` contiene el primer acceso; `features/export/` genera JSON versionado y HTML.
- `blocks/`: primitivas visuales, valores predeterminados compartidos, resolución de `appearance`, `placement` y `mobile`, y compresión/descomposición de secciones.
- `renderer/`: renderizado público y CSS del contenido. No importa Puck ni componentes de administración.
- `editor/`: configuración de Puck, campos, controles y desplegable de secciones dentro de Blocks.
- `api/` y `shared/`: solicitudes HTTP y utilidades.

## Contrato de estilos

Los colores se consumen por función con variables `--sp-*`: fondo, superficie, texto, borde, acción, hover, activo, foco, selección, error y deshabilitado. Las cuatro paletas cumplen el mismo contrato; un identificador inválido usa Lino.

Los estilos de cada funcionalidad usan CSS Modules y una capa explícita. Las propiedades CSS guardadas por el usuario prevalecen sobre los valores predeterminados de la paleta. Los valores móviles se resuelven con variables CSS, sin `!important` sobre estilos inline.

`VisualEditor` desactiva `iframe.syncHostStyles`. `CanvasFrame` carga explícitamente el CSS procesado por Vite para el contenido y el adaptador semántico `puckTheme.css`. Los tokens se aplican al documento del iframe, incluidos sus portales. Cambiar de tema no remonta Puck. Sus refs, eventos, overlays y geometría permanecen bajo control de Puck.

No añadir selectores de clases internas de Puck, reglas globales de tema al final de una hoja, ni cambios de altura o de `pointer-events` para aplicar colores. Las personalizaciones del proveedor pasan por sus variables semánticas.

Los slots de `Grid` y `Container` usan altura automática. El contenedor vertical usa `flex-wrap: nowrap`; el horizontal permite envolver sus elementos. El grid participa en el cálculo de anchura de su padre, sin `container-type: inline-size` (no hay consultas `@container`). Estas reglas evitan medir el texto de un grid anidado con una anchura intrínseca reducida y conservar una altura excesiva al estirarlo después.

## Secciones y documentos

Tipos soportados: `Grid`, `Container`, `Heading`, `Paragraph`, `Photo`, `Button`, `Spacer` y `Section`. `Section` guarda un árbol agrupado; descomponerlo vuelve a mostrar sus bloques editables.

`features/sections/templates.json` contiene seis plantillas sin imágenes. Su inserción clona todos los identificadores y añade el árbol al contenedor o grid seleccionado mediante una sola acción de datos. La biblioteca guardada permanece en `/api/components`.

La exportación JSON incluye `format`, `version`, `kind`, `name`, `theme` y `data`. El HTML usa el mismo renderer y CSS del contenido; las imágenes conservan sus URLs y las fuentes externas tienen fallback del sistema. La importación desde archivo no está implementada.

## Primer arranque y cambios de formato

`backend/seed.json` contiene la portada inicial compuesta con las nuevas secciones. El backend la carga cuando no hay páginas. El primer acceso autenticado solicita los datos del propietario y la paleta; `POST /api/setup` completa la configuración y personaliza/publica la portada inicial en una transacción. Los siguientes arranques conservan páginas y preferencias.

Los componentes antiguos se han eliminado del frontend. `backend/content_migration.py` convierte documentos guardados a primitivas. `backend/bootstrap.py` guarda los originales en `content_backups` antes de convertirlos y conserva sus identificadores principales, textos, imágenes reales y ajustes. El ejemplo antiguo intacto se sustituye por la nueva portada y se personaliza si ya hay un perfil configurado; los documentos personalizados se convierten conservando su contenido. La migración es idempotente.

## Comprobaciones

```bash
cd frontend
npm ci
npm run build
npm test
npm run format:check
```

Los tests de Node comprueban contratos de temas, valores de estilo, plantillas, compresión, inserción y exportación. No se incluye una suite de navegador: la revisión visual se hace manualmente por petición del usuario.

Caso manual de dimensiones: insertar un contenedor vertical, un título y después un grid de dos columnas con párrafo e imagen. Ampliar y reducir el párrafo: la fila debe ocupar la altura del elemento más alto, respetando la altura mínima configurada, y el contenedor debe sumar título, separación y grid. Revisar también el modo móvil, la página pública y que un contenedor horizontal siga envolviendo sus elementos.

Para las comprobaciones aisladas de API y arranque, instalar `backend/requirements-dev.txt` en un entorno Python 3.12 y ejecutar desde la raíz:

```bash
python -m unittest discover -s backend -p 'test_*.py' -v
```

Estas comprobaciones usan SQLite temporal y credenciales de prueba, sin leer `.env` ni modificar la base de datos del despliegue.
