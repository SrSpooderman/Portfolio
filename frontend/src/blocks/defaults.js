// Shared by the editor and the public renderer. Saved props take precedence.
export const blockDefaults = {
  Section: { content: [] },
  Grid: {
    content: [],
    columns: 3,
    mobileColumns: 1,
    gap: 24,
    layoutPreset: "custom",
    showGuides: false,
    reverseMobile: false,
  },
  Container: {
    content: [],
    direction: "column",
    gap: 20,
    appearance: { padding: 24 },
  },
  Heading: { text: "Título", level: "h2" },
  Paragraph: { text: "Texto" },
  Photo: { src: "", alt: "", height: 300, fit: "cover" },
  Button: {
    label: "Enlace",
    url: "#contacto",
    background: "",
    color: "",
    radius: 30,
  },
  Spacer: { height: 64 },
};
export const blockNames = {
  Section: "Sección",
  Grid: "Grid",
  Container: "Contenedor",
  Heading: "Título",
  Paragraph: "Párrafo",
  Photo: "Imagen",
  Button: "Enlace",
  Spacer: "Espaciador",
};
