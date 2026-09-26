import { defaults, components } from "../blocks/legacy";
import {
  Grid,
  Container,
  Photo,
  Heading,
  Paragraph,
  Button,
} from "../blocks/primitives";
export const registry = {
  ...Object.fromEntries(
    Object.entries(components).map(([type, render]) => [
      type,
      { render, defaults: defaults[type] },
    ]),
  ),
  Grid: {
    render: Grid,
    slots: ["content"],
    defaults: { content: [], columns: 3, mobileColumns: 1, gap: 24 },
  },
  Container: {
    render: Container,
    slots: ["content"],
    defaults: {
      content: [],
      direction: "column",
      gap: 20,
      appearance: { padding: 24 },
    },
  },
  Photo: {
    render: Photo,
    defaults: { src: "", alt: "", height: 300, fit: "cover" },
  },
  Heading: { render: Heading, defaults: { text: "Tu título", level: "h2" } },
  Paragraph: { render: Paragraph, defaults: { text: "Escribe tu historia." } },
  Button: {
    render: Button,
    defaults: {
      label: "Hablemos ↗",
      url: "#contacto",
      background: "#292f25",
      color: "#ffffff",
      radius: 30,
    },
  },
  Decoration: { render: () => null },
};
