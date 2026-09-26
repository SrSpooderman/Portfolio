import React, { useEffect, useState } from "react";
import { usePuck } from "@puckeditor/core";
import { cloneBlock, decompose, convertible } from "../blocks/transforms";
import { libraryApi } from "../api/components";
export function ComponentLibrary() {
  const { selectedItem, appState, dispatch, getSelectorForId } = usePuck();
  const [items, setItems] = useState([]),
    [name, setName] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [open, setOpen] = useState(false);
  const refresh = async () => setItems(await libraryApi());
  useEffect(() => {
    refresh().catch((e) => setMessage(e.message));
  }, []);
  async function action(fn) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  function replace(block) {
    const target = getSelectorForId(selectedItem.props.id);
    dispatch({
      type: "replace",
      destinationIndex: target.index,
      destinationZone: target.zone,
      data: block,
    });
  }
  function insert(block) {
    const copy = cloneBlock(block);
    dispatch({
      type: "set",
      state: {
        ...appState,
        data: { ...appState.data, content: [...appState.data.content, copy] },
      },
    });
    setMessage(
      "Copia añadida al final. Arrástrala a cualquier grid o contenedor.",
    );
  }
  return (
    <div className="component-library">
      <div className="library-actions">
        <button onClick={() => setOpen(!open)}>
          {open ? "Cerrar biblioteca" : "Secciones"}
        </button>
        <span>
          {selectedItem
            ? `Seleccionado: ${selectedItem.type}`
            : "Selecciona un bloque o contenedor para personalizarlo"}
        </span>
        {selectedItem && convertible.includes(selectedItem.type) && (
          <button
            onClick={() => {
              replace(decompose(selectedItem));
              setMessage(
                "Convertido en elementos independientes. Puedes mover, añadir y borrar cada elemento.",
              );
            }}
          >
            Descomponer en elementos
          </button>
        )}
      </div>
      {open && (
        <div className="library-panel">
          <h3>Secciones</h3>
          <p>
            Crea o edita secciones en el apartado Secciones del backoffice.
            También puedes guardar aquí el bloque seleccionado. Las inserciones
            son copias independientes.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              action(async () => {
                await libraryApi("", "POST", { name, content: selectedItem });
                await refresh();
                setName("");
                setMessage("Sección guardada en la biblioteca.");
              });
            }}
          >
            <input
              aria-label="Nombre de la sección"
              placeholder="Nombre de mi sección"
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <button disabled={!selectedItem || busy || !name.trim()}>
              Guardar seleccionado
            </button>
          </form>
          <div className="library-cards">
            {items.map((item) => (
              <div key={item.id}>
                <strong>{item.name}</strong>
                <button onClick={() => insert(item.content)}>
                  Insertar copia
                </button>
                <button
                  disabled={!selectedItem || busy}
                  onClick={() => {
                    if (
                      confirm(
                        `¿Actualizar «${item.name}» con la selección? Las copias existentes no cambian.`,
                      )
                    )
                      action(async () => {
                        await libraryApi("/" + item.id, "PATCH", {
                          name: item.name,
                          content: selectedItem,
                        });
                        await refresh();
                        setMessage("Sección actualizada.");
                      });
                  }}
                >
                  Actualizar con selección
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (
                      confirm(
                        "¿Eliminar de la biblioteca? Las copias existentes se conservan.",
                      )
                    )
                      action(async () => {
                        await libraryApi("/" + item.id, "DELETE");
                        await refresh();
                      });
                  }}
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
          {!items.length && <p>Todavía no has guardado secciones.</p>}
        </div>
      )}
      {message && (
        <p className="library-message" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
