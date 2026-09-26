import { defaults, components } from "../blocks/legacy";
const text = (label) => ({ type: "text", label });
const area = (label) => ({ type: "textarea", label });
export const schemas = {
  Hero: {
    eyebrow: text("Etiqueta"),
    title: area("Título"),
    description: area("Descripción"),
    button: text("Botón"),
    link: text("Enlace"),
  },
  About: {
    title: area("Título"),
    description: area("Descripción"),
    detail: text("Detalle"),
  },
  Projects: {
    title: text("Título"),
    items: {
      type: "array",
      label: "Proyectos",
      arrayFields: {
        title: text("Nombre"),
        category: text("Categoría"),
        description: area("Descripción"),
        url: text("Enlace"),
        color: text("Color de fondo"),
      },
      defaultItemProps: defaults.Projects.items[0],
    },
  },
  Text: { title: text("Título"), text: area("Texto") },
  Skills: {
    title: text("Título"),
    items: {
      type: "array",
      label: "Servicios",
      arrayFields: { title: text("Título"), description: area("Descripción") },
      defaultItemProps: defaults.Skills.items[0],
    },
  },
  Contact: { title: area("Título"), email: text("Email"), text: area("Texto") },
  Image: {
    src: text("URL de imagen /media/..."),
    alt: text("Texto alternativo"),
    caption: text("Pie de foto"),
  },
  Spacer: { height: { type: "number", label: "Altura", min: 0, max: 400 } },
  CTA: { title: text("Título"), label: text("Botón"), url: text("Enlace") },
};
