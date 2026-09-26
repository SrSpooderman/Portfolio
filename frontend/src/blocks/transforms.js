export const cloneBlock = (block) => {
  const clone = structuredClone(block);
  function walk(value) {
    if (!value || typeof value !== "object") return;
    if (value.type && value.props) {
      value.props.id = `${value.type}-${crypto.randomUUID()}`;
    }
    Object.values(value).forEach((v) => {
      if (v && typeof v === "object") walk(v);
    });
  }
  walk(clone);
  return clone;
};
const node = (type, props) => ({
  type,
  props: { id: `${type}-${crypto.randomUUID()}`, ...props },
});
const heading = (text, level = "h2") => node("Heading", { text, level });
const paragraph = (text) => node("Paragraph", { text });
const container = (content) =>
  node("Container", { content, gap: 20, direction: "column" });
// Convert fixed presets into actual nested editable elements. The original block is replaced only on request.
export function decompose(block) {
  const p = block.props;
  let result;
  switch (block.type) {
    case "Hero":
      result = node("Grid", {
        columns: 1,
        mobileColumns: 1,
        gap: 40,
        appearance: { padding: 48 },
        content: [
          container([
            paragraph(p.eyebrow),
            heading(p.title, "h1"),
            paragraph(p.description),
            node("Button", {
              label: p.button,
              url: p.link,
              background: "#292f25",
              color: "#fff",
              radius: 30,
            }),
          ]),
        ],
      });
      break;
    case "About":
      result = container([
        heading(p.title),
        paragraph(p.description),
        paragraph(p.detail),
      ]);
      break;
    case "Text":
      result = container([heading(p.title), paragraph(p.text)]);
      break;
    case "Contact":
      result = container([
        heading(p.title),
        paragraph(p.text),
        node("Button", { label: p.email, url: `mailto:${p.email}` }),
      ]);
      break;
    case "CTA":
      result = container([
        heading(p.title),
        node("Button", { label: p.label, url: p.url }),
      ]);
      break;
    case "Image":
      result = container([
        node("Photo", { src: p.src, alt: p.alt, height: 300 }),
        paragraph(p.caption),
      ]);
      break;
    case "Projects":
      result = container([
        heading(p.title),
        node("Grid", {
          columns: 3,
          mobileColumns: 1,
          gap: 24,
          content: (p.items || []).map((x) =>
            node("Container", {
              appearance: { background: x.color, padding: 24 },
              content: [
                node("Photo", {
                  src: x.image || "",
                  alt: x.title,
                  height: 240,
                }),
                heading(x.title, "h3"),
                paragraph(x.category),
                paragraph(x.description),
                node("Button", { label: "Ver proyecto ↗", url: x.url }),
              ],
            }),
          ),
        }),
      ]);
      break;
    case "Skills":
      result = container([
        heading(p.title),
        node("Grid", {
          columns: 3,
          mobileColumns: 1,
          gap: 24,
          content: (p.items || []).map((x) =>
            container([heading(x.title, "h3"), paragraph(x.description)]),
          ),
        }),
      ]);
      break;
    default:
      return block;
  }
  result.props.id = p.id;
  result.props.appearance = { ...result.props.appearance, ...p.appearance };
  result.props.placement = p.placement;
  result.props.mobile = p.mobile;
  return result;
}
export const convertible = [
  "Hero",
  "About",
  "Text",
  "Contact",
  "CTA",
  "Image",
  "Projects",
  "Skills",
];
