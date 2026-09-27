# SpiderPortfolio

Portfolio con editor visual, secciones reutilizables y cuatro paletas de colores.

## Ejecutar

```bash
python3 setup.py
docker compose up --build -d
```

- Web: http://localhost:8080
- Administración: http://localhost:8080/admin
- API: http://localhost:8080/api/docs
- Usuario: `superadmin`. Contraseña: `SUPERADMIN_PASSWORD` de `.env`.

En el primer acceso a administración aparece **Configuración inicial**. Introduce nombre, profesión, email, título, descripción y paleta. No hay datos personales predefinidos. Al completar el formulario se personaliza y publica la portada inicial de `backend/seed.json`.

Para aplicar cambios de código a una instalación existente:

```bash
docker compose up --build -d
```

Los datos e imágenes persisten en los volúmenes Docker. `docker compose down` los conserva; `docker compose down -v` los elimina. Cambiar `.env` no cambia la contraseña de un administrador ya creado. Compose mantiene el nombre `mvp` para reutilizar los volúmenes existentes.

## Páginas y secciones

En **Páginas → Editar diseño** puedes añadir, mover y editar bloques. **Guardar borrador** conserva los cambios; **Previsualizar** muestra el borrador; **Publicar** actualiza la web.

En **Blocks → Secciones** hay seis plantillas: presentación, sobre mí, proyectos, servicios, experiencia y contacto. No contienen imágenes. Selecciona un contenedor o grid y utiliza **⋯ → Insertar**. Puedes descomponer una sección para editar cada elemento y volver a comprimir el contenedor. También puedes guardar tus propias composiciones, editarlas y duplicarlas desde **Secciones**.

**Exportar página** descarga el borrador completo. **Exportar sección** descarga la composición completa. Hay dos formatos: JSON con estructura editable y HTML con estilos. El HTML usa las URLs originales de las imágenes; el JSON incluye el identificador de paleta. No hay importación de archivos por ahora.

## Configuración e imágenes

**Configuración** cambia los datos del sitio y la paleta: Lino, Glaciar, Grafito o Rojo y negro. La paleta se aplica al portfolio y a la administración; los colores personalizados de los bloques se conservan.

Sube imágenes en **Imágenes** o desde el campo de imagen del editor. Se admiten JPG, PNG y WebP de hasta 10 MB; el servidor genera WebP. Los textos de los bloques se editan en cada página.

## Actualización de documentos antiguos

Los componentes legacy se han retirado. Al arrancar, el backend convierte las páginas y secciones antiguas a los bloques actuales, guardando el JSON original en `content_backups`. Se conservan los datos personalizados. Las ilustraciones ficticias antiguas no forman parte del nuevo catálogo.

Una instalación que conserva exactamente el perfil de demostración anterior mostrará el asistente inicial. Los perfiles personalizados no vuelven a configurarse. El nuevo JSON inicial no sobrescribe páginas editadas en cada arranque.

## Estructura y validación

- `frontend/`: React, Puck, módulos CSS, renderer y exportación.
- `backend/`: FastAPI, PostgreSQL, contenido inicial y conversión de documentos.
- `nginx/`: proxy.
- [frontend/ARCHITECTURE.md](frontend/ARCHITECTURE.md): contratos y responsabilidades.

```bash
cd frontend
npm ci
npm run build
npm test
```

La revisión visual es manual. Las comprobaciones de arranque y API se ejecutan con `python -m unittest discover -s backend -p 'test_*.py' -v`, tras instalar `backend/requirements-dev.txt` en Python 3.12. Usan una base temporal.

## Servidor público

Configura dominio y TLS, `PUBLIC_URL` con el origen del sitio y `COOKIE_SECURE=true` con HTTPS. Cambia el puerto con `PORT`. El proyecto no incluye certificados ni despliegue a un proveedor.
