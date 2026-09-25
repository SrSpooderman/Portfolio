import type { ComponentData, Data } from '@puckeditor/core';
import type { DocumentPayload, EditorNode } from './editor-types';
import { layoutNodeTypes } from './editor-types';

export type PortfolioPuckProps = {
  id: string;
  content?: ComponentData[];
  nodeProps?: Record<string, any>;
  propsJson?: string;
  layoutJson?: string;
  stylesJson?: string;
  classes?: { styleClassId: string }[];
  analyticsKey?: string;
  componentDocumentId?: string;
  componentOverrides?: Record<string, any>;
  componentOverridesJson?: string;
  text?: string;
  href?: string;
  tag?: string;
  assetId?: string;
  alt?: string;
  columns?: number;
  direction?: string;
  wrap?: string;
  height?: number;
  symbol?: string;
  label?: string;
  language?: string;
  projectId?: string;
  projectIds?: { projectId: string }[];
  items?: { value: string; label: string }[];
  links?: { label: string; url: string }[];
  trackedLinkId?: string;
  analyticsEventType?: string;
  columnStartDesktop?: number;
  columnSpanDesktop?: number;
  minHeightDesktop?: number;
  gapDesktop?: string;
};

const UUID_AT_END = /([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

export function normalizePuckId(id: string): string {
  const uuid = id.match(UUID_AT_END)?.[1];
  if (uuid) return uuid;
  return id.length <= 36 ? id : id.slice(-36);
}

function sortedChildren(document: DocumentPayload, parentId: string | null) {
  return Object.values(document.nodes)
    .filter((node) => node.parent_id === parentId)
    .sort((left, right) => Number(left.position) - Number(right.position));
}

function responsiveNumber(value: any, breakpoint: 'desktop' | 'tablet' | 'mobile') {
  const candidate = value && typeof value === 'object' && !Array.isArray(value) ? value[breakpoint] : breakpoint === 'desktop' ? value : undefined;
  return candidate === undefined || candidate === '' ? undefined : Number(candidate);
}

function responsiveString(value: any, breakpoint: 'desktop' | 'tablet' | 'mobile') {
  const candidate = value && typeof value === 'object' && !Array.isArray(value) ? value[breakpoint] : breakpoint === 'desktop' ? value : undefined;
  return candidate === undefined || candidate === null ? undefined : String(candidate);
}

function nodeToComponent(document: DocumentPayload, node: EditorNode): ComponentData {
  const props = node.props ?? {};
  const puckProps: PortfolioPuckProps = {
    id: node.id,
    nodeProps: structuredClone(props),
    propsJson: JSON.stringify(props, null, 2),
    layoutJson: JSON.stringify(node.layout ?? {}, null, 2),
    stylesJson: JSON.stringify(node.style_overrides ?? {}, null, 2),
    classes: (node.classes ?? []).map((styleClassId) => ({ styleClassId })),
    analyticsKey: node.analytics_key ?? '',
    componentDocumentId: node.component_document_id,
    componentOverrides: structuredClone(node.component_overrides ?? {}),
    componentOverridesJson: JSON.stringify(node.component_overrides ?? {}, null, 2),
    text: props.text,
    href: props.href,
    tag: props.tag,
    assetId: props.asset_id,
    alt: props.alt,
    columns: props.columns,
    direction: props.direction,
    wrap: props.wrap,
    height: props.height,
    symbol: props.symbol,
    label: props.label,
    language: props.language,
    projectId: props.project_id,
    projectIds: Array.isArray(props.project_ids) ? props.project_ids.map((projectId: string) => ({ projectId })) : [],
    items: Array.isArray(props.items) ? structuredClone(props.items) : [],
    links: Array.isArray(props.links) ? structuredClone(props.links) : [],
    trackedLinkId: props.tracked_link_id,
    analyticsEventType: props.analytics_event_type,
    columnStartDesktop: responsiveNumber(node.layout?.columnStart, 'desktop'),
    columnSpanDesktop: responsiveNumber(node.layout?.columnSpan, 'desktop'),
    minHeightDesktop: responsiveNumber(node.layout?.minHeight, 'desktop'),
    gapDesktop: responsiveString(node.layout?.gap, 'desktop'),
  };
  if (layoutNodeTypes.has(node.node_type)) {
    puckProps.content = sortedChildren(document, node.id).map((child) => nodeToComponent(document, child));
  }
  return { type: node.node_type, props: puckProps } as ComponentData;
}

export function documentToPuckData(document: DocumentPayload): Data {
  return {
    root: { title: document.page?.title ?? document.document.name },
    content: sortedChildren(document, null).map((node) => nodeToComponent(document, node)),
  };
}

function objectFromJson(value: unknown, fallback: Record<string, any>) {
  if (typeof value !== 'string') return structuredClone(fallback);
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : structuredClone(fallback);
  } catch {
    return structuredClone(fallback);
  }
}

function setDefined(target: Record<string, any>, key: string, value: unknown) {
  if (value !== undefined && value !== null && value !== '') target[key] = value;
  else delete target[key];
}

function setDesktop(target: Record<string, any>, key: string, value: unknown) {
  if (value === undefined || value === null || value === '') return;
  const current = target[key];
  target[key] = current && typeof current === 'object' && !Array.isArray(current)
    ? { ...current, desktop: value }
    : { desktop: value };
}

export function puckDataToNodes(data: Data, document: DocumentPayload): EditorNode[] {
  const result: EditorNode[] = [];
  const visit = (component: ComponentData, parentPuckId: string | null, index: number) => {
    const puckProps = component.props as PortfolioPuckProps;
    const id = normalizePuckId(String(puckProps.id));
    const existing = document.nodes[id];
    const props = objectFromJson(puckProps.propsJson, puckProps.nodeProps ?? existing?.props ?? {});

    const direct: [string, unknown][] = [
      ['text', puckProps.text], ['href', puckProps.href], ['tag', puckProps.tag],
      ['asset_id', puckProps.assetId], ['alt', puckProps.alt], ['columns', puckProps.columns],
      ['direction', puckProps.direction], ['wrap', puckProps.wrap], ['height', puckProps.height],
      ['symbol', puckProps.symbol], ['label', puckProps.label], ['language', puckProps.language],
      ['project_id', puckProps.projectId], ['tracked_link_id', puckProps.trackedLinkId],
      ['analytics_event_type', puckProps.analyticsEventType],
    ];
    for (const [key, value] of direct) setDefined(props, key, value);
    if (puckProps.projectIds) setDefined(props, 'project_ids', puckProps.projectIds.map((item) => item.projectId).filter(Boolean));
    if (puckProps.items) setDefined(props, 'items', puckProps.items);
    if (puckProps.links) setDefined(props, 'links', puckProps.links);

    const layout = objectFromJson(puckProps.layoutJson, existing?.layout ?? {});
    setDesktop(layout, 'columnStart', puckProps.columnStartDesktop);
    setDesktop(layout, 'columnSpan', puckProps.columnSpanDesktop);
    setDesktop(layout, 'minHeight', puckProps.minHeightDesktop);
    setDesktop(layout, 'gap', puckProps.gapDesktop);

    result.push({
      id,
      document_id: document.document.id,
      parent_id: parentPuckId ? normalizePuckId(parentPuckId) : null,
      node_type: String(component.type),
      position: (index + 1) * 10,
      props,
      layout,
      style_overrides: objectFromJson(puckProps.stylesJson, existing?.style_overrides ?? {}),
      analytics_key: puckProps.analyticsKey || undefined,
      classes: (puckProps.classes ?? []).map((item) => item.styleClassId).filter(Boolean),
      component_document_id: puckProps.componentDocumentId || existing?.component_document_id,
      component_overrides: objectFromJson(puckProps.componentOverridesJson, puckProps.componentOverrides ?? existing?.component_overrides ?? {}),
    });

    if (layoutNodeTypes.has(String(component.type))) {
      (puckProps.content ?? []).forEach((child, childIndex) => visit(child, String(puckProps.id), childIndex));
    }
  };
  data.content.forEach((component, index) => visit(component, null, index));
  return result;
}

export function puckDataToDocument(data: Data, document: DocumentPayload): DocumentPayload {
  const nodes = puckDataToNodes(data, document);
  return {
    ...document,
    nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
    root_nodes: nodes.filter((node) => node.parent_id === null).map((node) => node.id),
  };
}
