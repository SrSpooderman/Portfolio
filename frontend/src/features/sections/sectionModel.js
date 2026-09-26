export const emptySection = () => ({
  type: "Container",
  props: {
    id: `Container-${crypto.randomUUID()}`,
    content: [],
    direction: "column",
    gap: 24,
    appearance: { padding: 32 },
  },
});
