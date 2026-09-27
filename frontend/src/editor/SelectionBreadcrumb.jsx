import { createUsePuck } from "@puckeditor/core";
import React from "react";
import { blockNames } from "../blocks/defaults";
import styles from "./ComponentLibrary.module.css";

const usePuck = createUsePuck();

function buildPath(selected, getParentById) {
  if (!selected?.props?.id) return [];
  const path = [selected];
  let cursor = selected;
  for (let i = 0; i < 20; i += 1) {
    const parent = getParentById(cursor.props.id);
    if (!parent?.props?.id) break;
    path.unshift(parent);
    cursor = parent;
  }
  return path;
}

function labelFor(block) {
  return block.props?.name || blockNames[block.type] || block.type;
}

export function SelectionBreadcrumb() {
  const selected = usePuck((s) => s.selectedItem);
  const dispatch = usePuck((s) => s.dispatch);
  const getParentById = usePuck((s) => s.getParentById);
  const getSelectorForId = usePuck((s) => s.getSelectorForId);
  const path = buildPath(selected, getParentById);

  if (!selected) {
    return (
      <span className={styles["selection-path"]}>Selecciona un bloque</span>
    );
  }

  return (
    <nav className={styles["selection-path"]} aria-label="Ruta del bloque">
      <span>Página</span>
      {path.map((block) => (
        <React.Fragment key={block.props.id}>
          <span aria-hidden="true">/</span>
          <button
            type="button"
            onClick={() => {
              const itemSelector = getSelectorForId(block.props.id);
              if (itemSelector)
                dispatch({ type: "setUi", ui: { itemSelector } });
            }}
          >
            {labelFor(block)}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
}
