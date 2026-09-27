import { blockDefaults } from "../blocks/defaults";
import {
  Grid,
  Container,
  Photo,
  Heading,
  Paragraph,
  Button,
  Spacer,
} from "../blocks/primitives";
export const registry = {
  Grid: {
    render: Grid,
    slots: ["content"],
    defaults: blockDefaults.Grid,
  },
  Container: {
    render: Container,
    slots: ["content"],
    defaults: blockDefaults.Container,
  },
  Photo: {
    render: Photo,
    defaults: blockDefaults.Photo,
  },
  Heading: {
    render: Heading,
    defaults: blockDefaults.Heading,
  },
  Paragraph: {
    render: Paragraph,
    defaults: blockDefaults.Paragraph,
  },
  Button: {
    render: Button,
    defaults: blockDefaults.Button,
  },
  Spacer: {
    render: Spacer,
    defaults: blockDefaults.Spacer,
  },
};
