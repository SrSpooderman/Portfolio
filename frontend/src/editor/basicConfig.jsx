import React, { useEffect, useState } from "react";
import { text, number, select, slot } from "../blocks/fields";
import {
  Grid,
  Container,
  Photo,
  Heading,
  Paragraph,
  Button,
} from "../blocks/primitives";
import { AssetField } from "./fields/AssetField";
const imageField = {
  type: "custom",
  label: "Imagen",
  render: (props) => <AssetField {...props} />,
};
export const basic = {
  Grid: {
    label: "Grid libre",
    fields: {
      content: slot,
      columns: number("Columnas escritorio", 1, 12),
      mobileColumns: number("Columnas móvil", 1, 6),
      gap: number("Separación (px)", 0, 200),
      rowHeight: number("Altura mínima de fila", 0, 1000),
      alignItems: select("Alineación vertical", [
        ["stretch", "Estirar"],
        ["start", "Arriba"],
        ["center", "Centro"],
        ["end", "Abajo"],
      ]),
    },
    defaultProps: { content: [], columns: 3, mobileColumns: 1, gap: 24 },
    render: Grid,
  },
  Container: {
    label: "Contenedor",
    fields: {
      content: slot,
      direction: select("Disposición", [
        ["column", "Vertical"],
        ["row", "Horizontal"],
      ]),
      gap: number("Separación", 0, 200),
      justify: select("Distribución", [
        ["flex-start", "Inicio"],
        ["center", "Centro"],
        ["flex-end", "Final"],
        ["space-between", "Separados"],
      ]),
      align: select("Alineación", [
        ["stretch", "Estirar"],
        ["flex-start", "Inicio"],
        ["center", "Centro"],
        ["flex-end", "Final"],
      ]),
    },
    defaultProps: {
      content: [],
      direction: "column",
      gap: 20,
      appearance: { padding: 24 },
    },
    render: Container,
  },
  Heading: {
    label: "Título",
    fields: {
      text: { type: "textarea", label: "Texto" },
      level: select("Nivel", [
        ["h1", "H1"],
        ["h2", "H2"],
        ["h3", "H3"],
        ["h4", "H4"],
      ]),
    },
    defaultProps: { text: "Tu título", level: "h2" },
    render: Heading,
  },
  Paragraph: {
    label: "Párrafo",
    fields: { text: { type: "textarea", label: "Texto" } },
    defaultProps: { text: "Escribe tu historia." },
    render: Paragraph,
  },
  Photo: {
    label: "Imagen libre",
    fields: {
      src: imageField,
      alt: text("Descripción accesible"),
      height: number("Altura (0 = natural)", 0, 1500),
      fit: select("Ajuste", [
        ["cover", "Cubrir"],
        ["contain", "Contener"],
      ]),
      link: text("Enlace opcional"),
    },
    defaultProps: { src: "", alt: "", height: 300, fit: "cover" },
    render: Photo,
  },
  Button: {
    label: "Botón / enlace",
    fields: {
      label: text("Texto"),
      url: text("Enlace"),
      background: text("Fondo"),
      color: text("Color"),
      radius: number("Radio", 0, 200),
    },
    defaultProps: {
      label: "Hablemos ↗",
      url: "#contacto",
      background: "#292f25",
      color: "#ffffff",
      radius: 30,
    },
    render: Button,
  },
  Decoration: {
    label: "Retirado",
    fields: {},
    defaultProps: {},
    render: () => null,
  },
};
