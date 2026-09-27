import { blockDefaults } from "../blocks/defaults";
import { Renderer } from "../renderer/Renderer";
import React, { useEffect, useState } from "react";
import { text, number, select, slot } from "../blocks/fields";
import {
  Grid,
  Container,
  Photo,
  Heading,
  Paragraph,
  Button,
  Spacer,
} from "../blocks/primitives";
import { AssetField } from "./fields/AssetField";
const imageField = {
  type: "custom",
  label: "Imagen",
  render: (props) => <AssetField {...props} />,
};
export const basic = {
  Section: {
    label: "Sección agrupada",
    fields: {},
    defaultProps: blockDefaults.Section,
    render: ({ content = [] }) => (
      <Renderer
        data={{
          content,
        }}
      />
    ),
  },
  Grid: {
    label: "Grid",
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
    defaultProps: blockDefaults.Grid,
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
    defaultProps: blockDefaults.Container,
    render: Container,
  },
  Heading: {
    label: "Título",
    fields: {
      text: {
        type: "textarea",
        label: "Texto",
      },
      level: select("Nivel", [
        ["h1", "H1"],
        ["h2", "H2"],
        ["h3", "H3"],
        ["h4", "H4"],
      ]),
    },
    defaultProps: blockDefaults.Heading,
    render: Heading,
  },
  Paragraph: {
    label: "Párrafo",
    fields: {
      text: {
        type: "textarea",
        label: "Texto",
      },
    },
    defaultProps: blockDefaults.Paragraph,
    render: Paragraph,
  },
  Photo: {
    label: "Imagen",
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
    defaultProps: blockDefaults.Photo,
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
    defaultProps: blockDefaults.Button,
    render: Button,
  },
  Spacer: {
    label: "Espaciador",
    fields: {
      height: number("Altura (px)", 0, 400),
    },
    defaultProps: blockDefaults.Spacer,
    render: Spacer,
  },
};
