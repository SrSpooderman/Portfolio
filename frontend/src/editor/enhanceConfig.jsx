import React, { useEffect, useState } from "react";
import { basic } from "./basicConfig";
import { common } from "../blocks/fields";
import { Box } from "../blocks/BlockBox";
export function enhanceConfig(legacy) {
  const all = { ...legacy, ...basic };
  return {
    categories: {
      layout: { title: "Estructura y grid", components: ["Grid", "Container"] },
      elements: {
        title: "Elementos libres",
        components: ["Heading", "Paragraph", "Photo", "Button", "Spacer"],
      },
      legacy: {
        title: "Compatibilidad",
        visible: false,
        components: [
          ...Object.keys(legacy).filter((k) => k !== "Spacer"),
          "Decoration",
        ],
      },
    },
    components: Object.fromEntries(
      Object.entries(all).map(([name, c]) => [
        name,
        {
          ...c,
          inline: true,
          fields: { ...c.fields, ...common },
          render: (props) => <Box {...props}>{c.render(props)}</Box>,
        },
      ]),
    ),
  };
}
