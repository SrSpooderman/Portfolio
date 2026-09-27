import React, { useMemo, useState } from "react";
import { createUsePuck } from "@puckeditor/core";
import ui from "../ui/primitives.module.css";
import styles from "./SectionDrawer.module.css";
import { portfolioTemplates } from "../features/sections/templates";
import { cloneBlock } from "../blocks/transforms";
import { blockNames } from "../blocks/defaults";
import { libraryApi } from "../api/components";
import { useSectionLibrary } from "./SectionLibraryContext";
import { insertIntoContainer } from "./sectionInsertion";
import { ExportMenu } from "../features/export/ExportMenu";
import {
  Box,
  Columns3,
  Grid2X2,
  Heading1,
  Image,
  Link,
  Pilcrow,
  Search,
  Space,
  Star,
} from "lucide-react";
const usePuck = createUsePuck();

const favoriteKey = "spiderportfolio:block-favorites";
const blockGroups = [
  {
    id: "structure",
    title: "Estructura",
    items: [
      { type: "Container", Icon: Box, hint: "Contenedor flexible" },
      { type: "Grid", Icon: Grid2X2, hint: "Columnas y filas" },
    ],
  },
  {
    id: "text",
    title: "Texto",
    items: [
      { type: "Heading", Icon: Heading1, hint: "Título" },
      { type: "Paragraph", Icon: Pilcrow, hint: "Párrafo" },
    ],
  },
  {
    id: "media",
    title: "Media",
    items: [{ type: "Photo", Icon: Image, hint: "Imagen" }],
  },
  {
    id: "actions",
    title: "Acciones",
    items: [
      { type: "Button", Icon: Link, hint: "Enlace" },
      { type: "Spacer", Icon: Space, hint: "Separación" },
    ],
  },
];

function readFavorites() {
  try {
    return JSON.parse(localStorage.getItem(favoriteKey)) || [];
  } catch {
    return [];
  }
}

function matches(value, query) {
  return value.toLowerCase().includes(query.trim().toLowerCase());
}

function sectionPreview(content) {
  const children = content?.props?.content || [];
  return [content?.type, ...children.slice(0, 3).map((item) => item.type)]
    .filter(Boolean)
    .join(" · ");
}

export function SectionDrawer({ children }) {
  const selected = usePuck((s) => s.selectedItem);
  const dispatch = usePuck((s) => s.dispatch);
  const { items, refresh, action, busy, setMessage } = useSectionLibrary();
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState(readFavorites);
  const canInsert = selected && ["Container", "Grid"].includes(selected.type);
  const zone = canInsert ? `${selected.props.id}:content` : null;
  const insertionIndex = selected?.props?.content?.length || 0;
  const filteredGroups = useMemo(() => {
    const pinned = new Set(favorites);
    const groups = blockGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          matches(`${blockNames[item.type]} ${item.hint}`, query),
        ),
      }))
      .filter((group) => group.items.length);
    const favoriteItems = blockGroups
      .flatMap((group) => group.items)
      .filter(
        (item) =>
          pinned.has(item.type) &&
          matches(`${blockNames[item.type]} ${item.hint}`, query),
      );
    return favoriteItems.length
      ? [
          { id: "favorites", title: "Favoritos", items: favoriteItems },
          ...groups,
        ]
      : groups;
  }, [favorites, query]);
  function toggleFavorite(type) {
    const next = favorites.includes(type)
      ? favorites.filter((item) => item !== type)
      : [...favorites, type];
    setFavorites(next);
    localStorage.setItem(favoriteKey, JSON.stringify(next));
  }
  function selectInserted(index = insertionIndex) {
    if (zone)
      dispatch({ type: "setUi", ui: { itemSelector: { zone, index } } });
  }
  function insertBlock(type) {
    if (!canInsert) return;
    const id = `${type}-${crypto.randomUUID()}`;
    dispatch({
      type: "insert",
      componentType: type,
      destinationZone: zone,
      destinationIndex: insertionIndex,
      id,
      recordHistory: true,
    });
    selectInserted();
    setMessage(`${blockNames[type]} insertado.`);
  }
  function insert(content, options = {}) {
    if (!canInsert) return;
    const copy = cloneBlock(content);
    if (options.libraryId) {
      copy.props.linked = true;
      copy.props.libraryId = options.libraryId;
      copy.props.libraryName = options.name;
    }
    dispatch({
      type: "setData",
      data: (current) => insertIntoContainer(current, selected.props.id, copy),
    });
    selectInserted();
    setMessage(
      options.libraryId
        ? "Instancia enlazada insertada."
        : "Sección insertada.",
    );
  }
  function blockCard(item) {
    const active = favorites.includes(item.type);
    const Icon = item.Icon;
    return (
      <article key={item.type} className={styles.card}>
        <div className={styles["block-card-main"]}>
          <span className={styles.thumbnail}>
            <Icon size={18} />
          </span>
          <div>
            <strong>{blockNames[item.type]}</strong>
            <small>{item.hint}</small>
          </div>
        </div>
        <div className={styles["card-actions"]}>
          <button
            type="button"
            className={styles["icon-button"]}
            aria-label={
              active
                ? `Quitar ${blockNames[item.type]} de favoritos`
                : `Añadir ${blockNames[item.type]} a favoritos`
            }
            aria-pressed={active}
            onClick={() => toggleFavorite(item.type)}
          >
            <Star size={15} fill={active ? "currentColor" : "none"} />
          </button>
          <button
            className={ui.button}
            disabled={!canInsert}
            onClick={() => insertBlock(item.type)}
          >
            Insertar
          </button>
        </div>
      </article>
    );
  }
  function card(item, saved) {
    const linked = saved;
    return (
      <div key={item.id} className={styles.card}>
        <div className={styles["section-card-main"]}>
          <span className={styles["section-thumb"]}>
            <Columns3 size={18} />
          </span>
          <div>
            <strong>{item.name}</strong>
            <small>{sectionPreview(item.content)}</small>
          </div>
        </div>
        <details className={styles.menu}>
          <summary aria-label={`Opciones de ${item.name}`}>⋯</summary>
          <div className={styles.actions}>
            <button
              className={ui.button}
              disabled={!canInsert || busy}
              onClick={() => insert(item.content)}
            >
              Insertar copia
            </button>
            {linked && (
              <button
                className={ui.button}
                disabled={!canInsert || busy}
                onClick={() =>
                  insert(item.content, {
                    libraryId: item.id,
                    name: item.name,
                  })
                }
              >
                Insertar enlazada
              </button>
            )}
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
  const filteredTemplates = portfolioTemplates.filter((item) =>
    matches(`${item.name} ${sectionPreview(item.content)}`, query),
  );
  const filteredSaved = items.filter((item) =>
    matches(`${item.name} ${sectionPreview(item.content)}`, query),
  );
  return (
    <>
      <div className={styles.search}>
        <Search size={16} />
        <input
          className={ui.input}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar bloques o secciones"
          aria-label="Buscar bloques o secciones"
        />
      </div>
      {!canInsert && (
        <p className={ui.p}>Selecciona un contenedor o grid para insertar.</p>
      )}
      {filteredGroups.map((group) => (
        <details className={styles.drawer} open key={group.id}>
          <summary>{group.title}</summary>
          <div className={styles["card-list"]}>
            {group.items.map(blockCard)}
          </div>
        </details>
      ))}
      <details className={styles.drawer} open>
        <summary>Secciones</summary>
        {filteredTemplates.length > 0 && (
          <>
            <h3 className={styles.label}>Portfolio</h3>
            <div className={styles["card-list"]}>
              {filteredTemplates.map((item) => card(item, false))}
            </div>
          </>
        )}
        {filteredSaved.length > 0 && (
          <>
            <h3 className={styles.label}>Guardadas</h3>
            <div className={styles["card-list"]}>
              {filteredSaved.map((item) => card(item, true))}
            </div>
          </>
        )}
      </details>
      <details className={styles.drawer}>
        <summary>Arrastrar</summary>
        {children}
      </details>
    </>
  );
}
