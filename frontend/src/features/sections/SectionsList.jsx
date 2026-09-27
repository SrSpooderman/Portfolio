import { ExportMenu } from "../export/ExportMenu";
import { portfolioTemplates } from "./templates";
import sectionsListStyles from "./SectionsList.module.css";
import ui from "../../ui/primitives.module.css";
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
      <button
        className={ui["button"] + " " + ui["primary"]}
        onClick={() =>
          open({
            name: "Nueva sección",
            content: emptySection(),
          })
        }
      >
        Crear sección +
      </button>
      {message && (
        <p className={ui["p"] + " " + ui["notice"]} role="status">
          {message}
        </p>
      )}
      <h2 className={ui.h2}>Secciones base</h2>
      <div className={sectionsListStyles["sections-list"]}>
        {portfolioTemplates.map((template) => (
          <article className={ui["page-card"]} key={template.id}>
            <h3 className={ui.h3}>{template.name}</h3>
            <button
              className={ui.button}
              onClick={() =>
                open({
                  name: template.name,
                  content: cloneBlock(template.content),
                })
              }
            >
              Usar plantilla
            </button>
            <ExportMenu
              data={{
                root: {},
                content: [template.content],
              }}
              name={template.name}
              kind="section"
            />
          </article>
        ))}
      </div>
      <h2 className={ui.h2}>Guardadas</h2>
      <div className={sectionsListStyles["sections-list"]}>
        {sections.map((section) => (
          <article className={ui["page-card"]} key={section.id}>
            <div>
              <h3 className={ui["h3"]}>{section.name}</h3>
              <small className={ui["small"]}>
                {section.updated_at
                  ? `Actualizada ${new Date(section.updated_at).toLocaleString("es")}`
                  : ""}
              </small>
            </div>
            <ExportMenu
              data={{
                root: {},
                content: [section.content],
              }}
              name={section.name}
              kind="section"
            />
            <button onClick={() => open(section)} className={ui["button"]}>
              Editar sección
            </button>
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
              className={ui["button"]}
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
              className={ui["button"]}
            >
              Eliminar
            </button>
          </article>
        ))}
      </div>
      {!sections.length && (
        <p className={ui["p"]}>No hay secciones guardadas.</p>
      )}
    </>
  );
}
