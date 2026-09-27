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
export const convertible = ["Section"];
export function decompose(block) {
  return block.type === "Section" ? expandSection(block) : block;
}

// A packed section retains the complete edited tree, not a copy of the original preset.
export function compressSection(block) {
  if (!["Grid", "Container"].includes(block.type)) return block;
  const inner = structuredClone(block);
  inner.props.id = `${inner.type}-${crypto.randomUUID()}`;
  return {
    type: "Section",
    props: {
      id: block.props.id,
      content: [inner],
      placement: block.props.placement,
      mobile: {
        span: block.props.mobile?.span,
        rowSpan: block.props.mobile?.rowSpan,
        column: block.props.mobile?.column,
        row: block.props.mobile?.row,
      },
    },
  };
}
export function expandSection(block) {
  const children = structuredClone(block.props.content || []);
  if (children.length === 1 && !block.props.appearance) {
    const inner = children[0];
    inner.props.id = block.props.id;
    inner.props.placement = block.props.placement;
    return inner;
  }
  return {
    type: "Container",
    props: {
      ...block.props,
      content: children,
      direction: "column",
      gap: 0,
      appearance: block.props.appearance || { padding: 0 },
    },
  };
}
