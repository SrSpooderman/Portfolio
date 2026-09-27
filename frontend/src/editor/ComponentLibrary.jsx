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
import { Grid2X2, Minus, Plus, RotateCcw, Smartphone } from "lucide-react";
const usePuck = createUsePuck();
const gridPresets = [
  ["two", "2"],
  ["three", "3"],
  ["third-left", "1/3"],
  ["third-right", "2/3"],
];
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
  function updateSelectedProps(nextProps) {
    if (!selected) return;
    replace({
      ...selected,
      props: {
        ...selected.props,
        ...nextProps,
      },
    });
  }
  function setGridPreset(layoutPreset) {
    const columns = layoutPreset === "three" ? 3 : 2;
    updateSelectedProps({ layoutPreset, columns });
  }
  function changeGridGap(step) {
    updateSelectedProps({
      gap: Math.max(0, Math.min(200, (Number(selected.props.gap) || 0) + step)),
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
        {selected?.type === "Grid" && (
          <div className={styles["quick-grid"]}>
            <Grid2X2 size={16} />
            {gridPresets.map(([preset, label]) => (
              <button
                key={preset}
                className={
                  ui.button +
                  " " +
                  (selected.props.layoutPreset === preset
                    ? styles["quick-active"]
                    : "")
                }
                onClick={() => setGridPreset(preset)}
              >
                {label}
              </button>
            ))}
            <button className={ui.button} onClick={() => changeGridGap(-4)}>
              <Minus size={14} />
            </button>
            <span>{selected.props.gap || 0}px</span>
            <button className={ui.button} onClick={() => changeGridGap(4)}>
              <Plus size={14} />
            </button>
            <button
              className={
                ui.button +
                " " +
                (selected.props.showGuides ? styles["quick-active"] : "")
              }
              onClick={() =>
                updateSelectedProps({ showGuides: !selected.props.showGuides })
              }
            >
              Guías
            </button>
          </div>
        )}
        {selected && ["Grid", "Container"].includes(selected.type) && (
          <button
            className={ui.button}
            onClick={() => replace(compressSection(selected))}
          >
            Agrupar
          </button>
        )}
        {selected && convertible.includes(selected.type) && (
          <button
            className={ui.button}
            onClick={() => replace(decompose(selected))}
          >
            Desagrupar
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
