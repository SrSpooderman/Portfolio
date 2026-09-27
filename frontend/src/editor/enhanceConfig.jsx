import React, { useEffect, useState } from "react";
import { basic } from "./basicConfig";
import { common } from "../blocks/fields";
import { Box } from "../blocks/BlockBox";
export function enhanceConfig() {
  return {
    categories: {
      layout: { title: "Estructura y grid", components: ["Grid", "Container"] },
      elements: {
        title: "Elementos libres",
        components: ["Heading", "Paragraph", "Photo", "Button", "Spacer"],
      },
      sections: {
        title: "Secciones agrupadas",
        visible: false,
        components: ["Section"],
      },
    },
    components: Object.fromEntries(
      Object.entries(basic).map(([name, c]) => [
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
