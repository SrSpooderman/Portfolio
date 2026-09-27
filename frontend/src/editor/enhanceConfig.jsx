import React, { useEffect, useState } from "react";
import { basic } from "./basicConfig";
import { common } from "../blocks/fields";
import { Box } from "../blocks/BlockBox";
export function enhanceConfig() {
  return {
    categories: {
      structure: {
        title: "Estructura",
        components: ["Grid", "Container"],
      },
      text: {
        title: "Texto",
        components: ["Heading", "Paragraph"],
      },
      media: {
        title: "Media",
        components: ["Photo"],
      },
      actions: {
        title: "Acciones",
        components: ["Button", "Spacer"],
      },
      sections: {
        title: "Secciones",
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
