// One data action inserts an entire tree, so undo also removes the entire insertion.
export function insertIntoContainer(data, targetId, block) {
  let inserted = false;
  function walk(items) {
    return items.map((item) => {
      if (
        item.props.id === targetId &&
        ["Container", "Grid"].includes(item.type)
      ) {
        inserted = true;
        return {
          ...item,
          props: {
            ...item.props,
            content: [...(item.props.content || []), block],
          },
        };
      }
      // Packed sections are deliberately opaque until decomposed.
      if (["Container", "Grid"].includes(item.type)) {
        return {
          ...item,
          props: { ...item.props, content: walk(item.props.content || []) },
        };
      }
      return item;
    });
  }
  const content = walk(data.content || []);
  return inserted ? { ...data, content } : data;
}
