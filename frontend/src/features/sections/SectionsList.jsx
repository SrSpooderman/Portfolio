import React from "react";
import { request } from "../../api/components";
import { cloneBlock } from "../../blocks/transforms";
import { emptySection } from "./sectionModel";
export function SectionsList({
  sections,
  open,
  message,
  busy,
  action,
  refresh,
}) {
  return (
    <>
      <p>
        Crea secciones con grids, textos, imágenes y botones. Cada sección es
        una composición reutilizable; las copias insertadas en páginas se editan
        de forma independiente.
      </p>
      <button
        className="primary"
        onClick={() => open({ name: "Nueva sección", content: emptySection() })}
      >
        Crear sección +
      </button>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <div className="sections-list">
        {sections.map((section) => (
          <article className="page-card" key={section.id}>
            <div>
              <h3>{section.name}</h3>
              <small>
                {section.updated_at
                  ? `Actualizada ${new Date(section.updated_at).toLocaleString("es")}`
                  : ""}
              </small>
            </div>
            <button onClick={() => open(section)}>Editar sección</button>
            <button
              disabled={busy}
              onClick={() =>
                action(async () => {
                  await request("", "POST", {
                    name: (section.name + " (copia)").slice(0, 100),
                    content: cloneBlock(section.content),
                  });
                  await refresh();
                })
              }
            >
              Duplicar
            </button>
            <button
              disabled={busy}
              onClick={() => {
                if (
                  confirm(
                    "¿Eliminar la sección de la biblioteca? Las copias ya insertadas se conservan.",
                  )
                )
                  action(async () => {
                    await request("/" + section.id, "DELETE");
                    await refresh();
                  });
              }}
            >
              Eliminar
            </button>
          </article>
        ))}
      </div>
      {!sections.length && (
        <p>
          Aún no hay secciones. Crea la primera y diseña su contenido en el
          editor.
        </p>
      )}
    </>
  );
}
