export const text = (label) => ({ type: "text", label });
export const number = (label, min = 0, max = 1000) => ({
  type: "number",
  label,
  min,
  max,
});
export const select = (label, values) => ({
  type: "select",
  label,
  options: values.map(([value, label]) => ({ value, label })),
});
export const object = (label, objectFields) => ({
  type: "object",
  label,
  objectFields,
});
export const styleFields = {
  background: text("Fondo (color CSS)"),
  color: text("Color del texto"),
  padding: number("Espacio interior (px)"),
  margin: number("Margen exterior (px)"),
  radius: number("Bordes redondeados (px)", 0, 300),
  borderWidth: number("Grosor del borde", 0, 30),
  borderColor: text("Color del borde"),
  maxWidth: number("Ancho máximo (0 = libre)", 0, 2400),
  minHeight: number("Altura mínima", 0, 1500),
  fontSize: number("Tamaño de texto", 0, 180),
  fontFamily: select("Tipografía", [
    ["inherit", "Heredada"],
    ["Manrope, sans-serif", "Manrope"],
    ["DM Sans, sans-serif", "DM Sans"],
    ["Georgia, serif", "Georgia"],
    ["monospace", "Monoespaciada"],
  ]),
  align: select("Alineación", [
    ["left", "Izquierda"],
    ["center", "Centro"],
    ["right", "Derecha"],
  ]),
  shadow: select("Sombra", [
    ["none", "Ninguna"],
    ["0 12px 35px #0002", "Suave"],
    ["0 20px 60px #0004", "Intensa"],
  ]),
};
const positionFields = {
  span: number("Columnas que ocupa", 1, 12),
  rowSpan: number("Filas que ocupa", 1, 12),
  column: number("Columna inicial (0 = automática)", 0, 12),
  row: number("Fila inicial (0 = automática)", 0, 100),
};
export const common = {
  appearance: object("Estilos", styleFields),
  placement: object("Posición en el grid", positionFields),
  mobile: object("Móvil (hasta 700 px)", {
    ...positionFields,
    padding: number("Espacio interior", 0, 300),
    fontSize: number("Tamaño de texto", 0, 100),
    hidden: select("Visibilidad", [
      [false, "Visible"],
      [true, "Oculto"],
    ]),
  }),
};
export const slot = { type: "slot" };
