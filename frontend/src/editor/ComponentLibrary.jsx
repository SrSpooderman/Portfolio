import { blockDefaults } from "../blocks/defaults";
import React, { useState } from "react";
import { createUsePuck } from "@puckeditor/core";
import ui from "../ui/primitives.module.css";
import styles from "./ComponentLibrary.module.css";
import { decompose, convertible, compressSection } from "../blocks/transforms";
import { libraryApi } from "../api/components";
import { useSectionLibrary } from "./SectionLibraryContext";
import { ExportMenu } from "../features/export/ExportMenu";
import { SelectionBreadcrumb } from "./SelectionBreadcrumb";
import { RotateCcw, Smartphone } from "lucide-react";
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
    if (!target) return;
    dispatch({
      type: "replace",
      destinationIndex: target.index,
      destinationZone: target.zone,
      data: block,
    });
  }
  function resetAppearance() {
    if (!selected) return;
    const block = structuredClone(selected);
    const defaults = blockDefaults[selected.type] || {};
    if (defaults.appearance)
      block.props.appearance = structuredClone(defaults.appearance);
    else delete block.props.appearance;
    replace(block);
  }
  function resetMobile() {
    if (!selected) return;
    const block = structuredClone(selected);
    delete block.props.mobile;
    replace(block);
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
        <SelectionBreadcrumb />
        {selected && (
          <>
            <button className={ui.button} onClick={resetAppearance}>
              <RotateCcw size={16} />
              Estilos
            </button>
            <button className={ui.button} onClick={resetMobile}>
              <Smartphone size={16} />
              Móvil
            </button>
          </>
        )}
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
