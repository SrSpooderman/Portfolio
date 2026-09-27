import React from "react";
import { createUsePuck } from "@puckeditor/core";
import ui from "../ui/primitives.module.css";
import styles from "./SectionDrawer.module.css";
import { portfolioTemplates } from "../features/sections/templates";
import { cloneBlock } from "../blocks/transforms";
import { libraryApi } from "../api/components";
import { useSectionLibrary } from "./SectionLibraryContext";
import { insertIntoContainer } from "./sectionInsertion";
import { ExportMenu } from "../features/export/ExportMenu";
const usePuck = createUsePuck();
export function SectionDrawer({ children }) {
  const selected = usePuck((s) => s.selectedItem);
  const dispatch = usePuck((s) => s.dispatch);
  const { items, refresh, action, busy, setMessage } = useSectionLibrary();
  const canInsert = selected && ["Container", "Grid"].includes(selected.type);
  function insert(content) {
    if (!canInsert) return;
    const copy = cloneBlock(content);
    dispatch({
      type: "setData",
      data: (current) => insertIntoContainer(current, selected.props.id, copy),
    });
    setMessage("Sección insertada en el contenedor seleccionado.");
  }
  function card(item, saved) {
    return (
      <div key={item.id} className={styles.card}>
        <span>{item.name}</span>
        <details className={styles.menu}>
          <summary aria-label={`Opciones de ${item.name}`}>⋯</summary>
          <div className={styles.actions}>
            <button
              className={ui.button}
              disabled={!canInsert || busy}
              onClick={() => insert(item.content)}
            >
              Insertar
            </button>
            <ExportMenu
              data={{ root: {}, content: [item.content] }}
              name={item.name}
              kind="section"
            />
            {saved && (
              <>
                <button
                  className={ui.button}
                  disabled={!selected || busy}
                  onClick={() => {
                    if (confirm(`¿Actualizar «${item.name}» con la selección?`))
                      action(async () => {
                        await libraryApi("/" + item.id, "PATCH", {
                          name: item.name,
                          content: selected,
                        });
                        await refresh();
                      });
                  }}
                >
                  Actualizar con selección
                </button>
                <button
                  className={ui.button}
                  disabled={busy}
                  onClick={() => {
                    if (confirm(`¿Eliminar «${item.name}» de la biblioteca?`))
                      action(async () => {
                        await libraryApi("/" + item.id, "DELETE");
                        await refresh();
                      });
                  }}
                >
                  Eliminar
                </button>
              </>
            )}
          </div>
        </details>
      </div>
    );
  }
  return (
    <>
      {children}
      <details className={styles.drawer} open>
        <summary>Secciones</summary>
        {!canInsert && (
          <p className={ui.p}>Selecciona un contenedor o grid para insertar.</p>
        )}
        <h3 className={styles.label}>Portfolio</h3>
        {portfolioTemplates.map((item) => card(item, false))}
        {items.length > 0 && (
          <>
            <h3 className={styles.label}>Guardadas</h3>
            {items.map((item) => card(item, true))}
          </>
        )}
      </details>
    </>
  );
}
