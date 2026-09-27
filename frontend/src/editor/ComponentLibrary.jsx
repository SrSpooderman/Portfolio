import { blockNames } from "../blocks/defaults";
import React, { useState } from "react";
import { createUsePuck } from "@puckeditor/core";
import ui from "../ui/primitives.module.css";
import styles from "./ComponentLibrary.module.css";
import { decompose, convertible, compressSection } from "../blocks/transforms";
import { libraryApi } from "../api/components";
import { useSectionLibrary } from "./SectionLibraryContext";
import { ExportMenu } from "../features/export/ExportMenu";
const usePuck = createUsePuck();
export function ComponentLibrary() {
  const selected = usePuck((s) => s.selectedItem);
  const dispatch = usePuck((s) => s.dispatch);
  const back = usePuck((s) => s.history.back);
  const forward = usePuck((s) => s.history.forward);
  const hasPast = usePuck((s) => s.history.hasPast);
  const hasFuture = usePuck((s) => s.history.hasFuture);
  const getSelectorForId = usePuck((s) => s.getSelectorForId);
  const { refresh, message, setMessage, busy, action } = useSectionLibrary();
  const [name, setName] = useState("");
  function replace(block) {
    const target = getSelectorForId(selected.props.id);
    dispatch({
      type: "replace",
      destinationIndex: target.index,
      destinationZone: target.zone,
      data: block,
    });
  }
  return (
    <div className={styles["component-library"]}>
      <div className={styles["library-actions"]}>
        <button className={ui.button} disabled={!hasPast} onClick={back}>
          Deshacer
        </button>
        <button className={ui.button} disabled={!hasFuture} onClick={forward}>
          Rehacer
        </button>
        <span>
          {selected ? blockNames[selected.type] : "Selecciona un bloque"}
        </span>
        {selected && ["Grid", "Container"].includes(selected.type) && (
          <button
            className={ui.button}
            onClick={() => replace(compressSection(selected))}
          >
            Comprimir sección
          </button>
        )}
        {selected && convertible.includes(selected.type) && (
          <button
            className={ui.button}
            onClick={() => replace(decompose(selected))}
          >
            Descomponer en elementos
          </button>
        )}
        {selected && (
          <>
            <ExportMenu
              data={{ root: {}, content: [selected] }}
              kind="section"
              name="Sección"
            />
            <details>
              <summary className={ui.a}>Guardar como sección</summary>
              <form
                className={styles["save-form"]}
                onSubmit={(event) => {
                  event.preventDefault();
                  action(async () => {
                    await libraryApi("", "POST", { name, content: selected });
                    await refresh();
                    setName("");
                    setMessage("Sección guardada.");
                  });
                }}
              >
                <input
                  className={ui.input}
                  aria-label="Nombre de la sección"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                />
                <button className={ui.button} disabled={busy || !name.trim()}>
                  Guardar sección
                </button>
              </form>
            </details>
          </>
        )}
      </div>
      {message && (
        <p className={ui.p} role="status">
          {message}
        </p>
      )}
    </div>
  );
}
