# Plan de reconstrucción del sistema de estilos

Fecha: 27 de septiembre de 2026. Objetivo: compartir cuatro paletas entre la aplicación, la web publicada y el editor, manteniendo independientes sus estilos y sus interacciones.

## Arquitecturas comparadas

| Arquitectura | Ventajas para SpiderPortfolio | Coste y límites |
| --- | --- | --- |
| **Tokens semánticos + CSS Modules + capas de cascada + iframe aislado** | Encaja con React y Vite existentes. Clases locales; colores centralizados; CSS estático; permite mantener los estilos personalizados del JSON. | Requiere separar las hojas actuales y un adaptador explícito para Puck. Las capas por sí solas no aíslan documentos. |
| **Tailwind + tokens + variantes de componentes** | Estados y espaciado coherentes mediante utilidades y variantes. | Reescritura considerable del marcado. Los estilos dinámicos del documento necesitan variables o mapas estáticos; el iframe y Puck siguen necesitando integración propia. |
| **Emotion + temas + caché por documento** | Estilos junto al componente y variantes dinámicas. | Añade ejecución e inserción de CSS en runtime. Mantener cachés, orden de inserción y portales en dos documentos aumenta la complejidad del editor. |

Fuentes primarias: [CSS Modules en Vite](https://vite.dev/guide/features#css-modules), [variables de tema de Tailwind](https://tailwindcss.com/docs/theme) y [caché e inserción de Emotion](https://emotion.sh/docs/@emotion/cache).

**Decisión: primera arquitectura.** La prioridad es establecer límites entre interfaz, contenido editable e interacción del editor. Es la opción con menos infraestructura nueva y mejor encaje con el renderer independiente que ya existe. Ninguna biblioteca garantiza por sí misma el funcionamiento del hover.

## Contratos

1. **Tema:** catálogo validado con `linen`, `glacier`, `graphite` y `crimson`; dos claros y dos oscuros, incluyendo rojo y negro. Tokens por función: fondo, superficie, texto, texto secundario, borde, acción, hover, activo, foco, selección, deshabilitado y error. Un identificador desconocido utiliza Lino. Cada paleta debe cumplir el mismo contrato.
2. **Interfaz:** CSS Modules para formularios, administración, biblioteca, herramientas y selector de temas. Ninguna regla global de botones o párrafos puede modificar los controles de Puck.
3. **Contenido:** estilos compartidos por renderer público y lienzo. Los valores explícitos guardados por el usuario prevalecen sobre los valores predeterminados del tema. Mantener `appearance`, `placement`, `mobile`, identificadores, slots y secciones agrupadas.
4. **Puck:** adaptador de variables semánticas documentadas. Prohibir selectores parciales de clases internas y cambios de geometría, `pointer-events` o refs para aplicar una paleta. Mantener `dragRef` y el comportamiento nativo de selección y arrastre.
5. **Carga:** orden explícito de capas para reset, proveedor, contenido, aplicación y adaptador. Evitar reglas propias sin capa que ganen accidentalmente a todas las demás. Las hojas del lienzo se incluyen de forma explícita mediante Vite, en desarrollo y producción.

Puck documenta el uso de variables CSS para personalizar su interfaz: [theming](https://puckeditor.com/docs/extending-puck/theming). Su opción `syncHostStyles: false` permite aislar los estilos del documento anfitrión conservando los estilos de interacción del iframe; se ha comprobado también su presencia en la versión 0.23.0 instalada: [configuración del iframe](https://puckeditor.com/docs/api-reference/components/puck#iframe).

## División prevista

```text
theme/                 Catálogo, contrato y aplicación de tokens al documento
styles/                Reset mínimo y orden explícito de capas
ui/                    Estilos compartidos de controles propios
features/…             Módulos CSS de cada funcionalidad
layouts/               Módulo del backoffice
blocks/                CSS y resolución de estilos del contenido editable
renderer/              Entrada CSS compartida para contenido público y lienzo
editor/                Adaptador Puck y puente de estilos del iframe
tests/                 Contratos y pruebas reales de navegador
```

El cambio de tema actualiza tokens sin remontar Puck ni cambiar el borrador. Los overlays y portales deben recibir el tema en su documento correspondiente. La carga del iframe no debe depender de nombres de assets con hash escritos a mano ni copiar todas las hojas del backoffice.

## Orden de implementación y comprobaciones

### 1. Contrato y catálogo

Implementar tokens validados y resolver seguro del identificador. Separar los colores de los estados interactivos. Conservar el campo `theme` de la API y sus identificadores actuales. Pruebas de catálogo completo, fallback y estados diferenciados.

### 2. Separación de estilos

Migrar las reglas globales a módulos con dueño definido. Sustituir colores estructurales por tokens en su regla original; eliminar la hoja final de parches de tema. Conservar colores ilustrativos de contenido heredado y colores personalizados guardados. Mantener comportamiento responsive y layout existentes.

### 3. Integración aislada con Puck

Desactivar la copia automática de estilos. Cargar explícitamente CSS del contenido y adaptador de tokens en el iframe. Comprobar overlays, selección anidada y arrastre antes de considerar estable la integración. No alterar altura del canvas para corregir espacios ni usar colores como sustituto de eventos funcionales.

### 4. Paridad de contenido

Centralizar la resolución de estilos de los bloques. Verificar mismo resultado a igual ancho entre iframe, previsualización y web pública. Los estilos móviles deben funcionar sin `!important` contra estilos inline. Comprimir/descomponer secciones debe conservar contenido, estilos y orden.

### 5. Pruebas persistentes

- Pruebas de contrato y reglas de arquitectura: no selectores de clases internas de Puck, no hoja global de parches, catálogo completo y estilos de usuario preservados.
- Navegador con las cuatro paletas: acceso, resumen, páginas, imágenes, secciones, configuración y editor. Hover, foco de teclado y controles deshabilitados.
- Hover **real sobre bloques del lienzo**, comprobando overlay visible; selección de un hijo, arrastre, cambios de campos y continuidad al cambiar de tema. Incluir iframe con scroll y tamaño móvil.
- Borradores de prueba con contenedor, grid, texto, imagen, botón y sección agrupada. Pruebas de ida y vuelta al comprimir/descomponer.
- Capturas para revisión y pruebas en Chromium y Firefox; errores de JavaScript o estilos ausentes bloquean la entrega. Ejecutar también build de producción y verificar la carga explícita del iframe.

Las pruebas deben usar datos aislados o respuestas API controladas, sin modificar páginas ni configuración reales. No afirmar que un estado está cubierto basándose solo en que el build compila o un botón cambia de color.

## Entrega y mantenimiento

Actualizar `ARCHITECTURE.md` con los contratos y comandos de verificación. Mantener los cambios del usuario existentes. No se necesita una migración de base de datos. Registrar qué pruebas se ejecutaron y qué límites quedan; no prometer ausencia absoluta de futuras regresiones.

## Cambios acordados durante la implementación

El usuario ha pedido revisión visual manual y prescindir de pruebas Chromium. La entrega conserva comprobaciones de contratos, compilación y API; no incluye la suite de navegador prevista inicialmente. Las pruebas de navegador ejecutadas antes de esa indicación no sustituyen la revisión del estado final.

También se incorporan el desplegable de secciones en Blocks, exportación JSON/HTML, seis plantillas sin imágenes, retirada de los componentes antiguos, textos mínimos y configuración inicial del propietario. La retirada requiere convertir documentos almacenados; el backend guarda copias antes de esa conversión. Los detalles definitivos están en `ARCHITECTURE.md`.
