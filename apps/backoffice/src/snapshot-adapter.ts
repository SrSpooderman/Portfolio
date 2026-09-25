import type { Node, Snapshot } from '@portfolio/renderer';
import type { DocumentPayload } from './editor-types';

export function toSnapshot(document: DocumentPayload, classes: any[], tokens: any[], projects: any[], assets: any[], componentDocs: Record<string, DocumentPayload>): Snapshot {
  const nodes: Record<string, Node> = {};
  for (const source of Object.values(document.nodes)) nodes[source.id] = {
    id: source.id,
    parentId: source.parent_id,
    type: source.node_type === 'COMPONENT_INSTANCE' ? 'STACK' : source.node_type,
    position: source.position,
    props: source.props ?? {},
    layout: source.layout ?? {},
    styles: source.style_overrides ?? {},
    classes: (source.classes ?? []).map((id) => classes.find((candidate) => candidate.id === id)?.slug ?? id),
    analyticsKey: source.analytics_key,
  };
  for (const instance of Object.values(document.nodes).filter((node) => node.node_type === 'COMPONENT_INSTANCE')) {
    const source = componentDocs[instance.component_document_id ?? ''];
    if (!source) continue;
    for (const componentNode of Object.values(source.nodes)) {
      const id = `${instance.id}:${componentNode.id}`;
      const override = instance.component_overrides?.[componentNode.id];
      const classIds = [...(componentNode.classes ?? [])];
      for (const change of override?.class_changes ?? []) {
        const index = classIds.indexOf(change.style_class_id);
        if (change.action === 'REMOVE' && index >= 0) classIds.splice(index, 1);
        if (change.action === 'ADD' && index < 0) classIds.push(change.style_class_id);
      }
      nodes[id] = {
        id,
        parentId: componentNode.parent_id ? `${instance.id}:${componentNode.parent_id}` : instance.id,
        type: componentNode.node_type,
        position: componentNode.position,
        props: { ...(componentNode.props ?? {}), ...(override?.props_override ?? {}) },
        layout: componentNode.layout ?? {},
        styles: { ...(componentNode.style_overrides ?? {}), ...(override?.style_override ?? {}) },
        classes: classIds.map((classId) => classes.find((candidate) => candidate.id === classId)?.slug ?? classId),
        analyticsKey: componentNode.analytics_key,
      };
    }
  }
  return {
    schemaVersion: 1,
    theme: { tokens: Object.fromEntries(tokens.map((token) => [token.key, token.value])) },
    styles: Object.fromEntries(classes.map((style) => [style.slug, style.rules ?? {}])),
    pages: { '/': { id: document.document.id, title: document.page?.title ?? document.document.name, rootNodes: document.root_nodes } },
    nodes,
    projects: Object.fromEntries(projects.map((project) => [project.id, project])),
    assets: Object.fromEntries(assets.map((asset) => [asset.id, { url: `/assets/${asset.storage_key}`, alt: asset.alt_text }])),
    trackedLinks: {},
  };
}
