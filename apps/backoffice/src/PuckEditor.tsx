import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Puck, type ComponentData, type Config, type Data } from '@puckeditor/core';
import { PageRenderer } from '@portfolio/renderer';
import '@puckeditor/core/no-external.css';
import { api, ApiError } from './api';
import type { DocumentPayload } from './editor-types';
import { layoutNodeTypes, nodeTypes } from './editor-types';
import { documentToPuckData, normalizePuckId, puckDataToDocument, puckDataToNodes, type PortfolioPuckProps } from './puck-adapter';
import { toSnapshot } from './snapshot-adapter';
import './puck-editor.css';

type Resource = Record<string, any>;
type ItemSelector = { index: number; zone?: string };

type Props = {
  document: DocumentPayload;
  assets: Resource[];
  projects: Resource[];
  links: Resource[];
  classes: Resource[];
  tokens: Resource[];
  components: Resource[];
  componentDocs: Record<string, DocumentPayload>;
  onLocalChange: (document: DocumentPayload) => void;
  onSaved: (document: DocumentPayload) => void;
  onReload: (document: DocumentPayload, message: string) => void;
  onSavingChange: (saving: boolean) => void;
  onMessage: (message: string) => void;
  onPublish: () => Promise<void>;
  onSelectionChange: (id: string | null) => void;
};

const labels: Record<string, string> = {
  SECTION: 'Sección', CONTAINER: 'Contenedor', GRID: 'Grid', FLEX: 'Flex', COLUMNS: 'Columnas', STACK: 'Pila',
  SPACER: 'Espaciador', HEADING: 'Título', TEXT: 'Texto', IMAGE: 'Imagen', VIDEO: 'Vídeo', BUTTON: 'Botón',
  LINK: 'Enlace', ICON: 'Icono', PROJECT: 'Proyecto', PROJECT_LIST: 'Lista de proyectos', PROJECT_CARD: 'Tarjeta de proyecto',
  STATS: 'Estadísticas', CODE: 'Código', SOCIAL_LINKS: 'Redes sociales', COMPONENT_INSTANCE: 'Componente vinculado',
};

const textTypes = new Set(['HEADING', 'TEXT', 'BUTTON', 'LINK', 'CODE']);

function jsonObject(value: unknown): Record<string, any> {
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function responsive(value: any, breakpoint: 'desktop' | 'tablet' | 'mobile') {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value[breakpoint] ?? (breakpoint === 'mobile' ? value.tablet : undefined) ?? value.desktop;
  }
  return value;
}

function cssValue(value: unknown, tokens: Record<string, any>): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  if (typeof value === 'string') {
    const key = value.startsWith('$') ? value.slice(1) : Object.hasOwn(tokens, value) ? value : '';
    if (key) return `var(--${key.replace(/[^a-zA-Z0-9_-]/g, '-')})`;
  }
  return String(value).replace(/[;{}]/g, '');
}

function declarations(values: Record<string, any>, tokens: Record<string, any>) {
  return Object.entries(values).map(([key, raw]) => {
    const value = cssValue(raw, tokens);
    const property = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`).replace(/[^a-zA-Z0-9-]/g, '');
    return value === undefined || !property ? '' : `${property}:${value}`;
  }).filter(Boolean).join(';');
}

function rulesFor(props: PortfolioPuckProps, type: string, metadata: Record<string, any>) {
  const layout = jsonObject(props.layoutJson);
  const overrides = jsonObject(props.stylesJson);
  const tokens = Object.fromEntries((metadata.tokens ?? []).map((token: Resource) => [token.key, token.value]));
  const styleClasses = metadata.classes ?? [];
  const classIds = (props.classes ?? []).map((entry) => entry.styleClassId);
  const id = String(props.id).replace(/["\\]/g, '');
  const selector = `[data-portfolio-node="${id}"]`;
  const output: string[] = [];

  for (const breakpoint of ['desktop', 'tablet', 'mobile'] as const) {
    const base: Record<string, any> = {};
    for (const classId of classIds) {
      const styleClass = styleClasses.find((candidate: Resource) => candidate.id === classId);
      Object.assign(base, styleClass?.rules?.[breakpoint]?.default ?? {});
    }
    Object.assign(base, overrides?.[breakpoint]?.default ?? {});
    const span = responsive(layout.columnSpan, breakpoint);
    const start = responsive(layout.columnStart, breakpoint);
    if (span) base.gridColumn = start ? `${start} / span ${span}` : `span ${span}`;
    for (const key of ['gap', 'minHeight', 'alignItems', 'justifyContent']) {
      const value = responsive(layout[key], breakpoint);
      if (value !== undefined) base[key] = value;
    }
    const body = declarations(base, tokens);
    const wrap = breakpoint === 'desktop' ? (value: string) => value : breakpoint === 'tablet'
      ? (value: string) => `@media(max-width:900px){${value}}`
      : (value: string) => `@media(max-width:600px){${value}}`;
    if (body) output.push(wrap(`${selector}{${body}}`));
    for (const state of ['hover', 'focus'] as const) {
      const interaction: Record<string, any> = {};
      for (const classId of classIds) {
        const styleClass = styleClasses.find((candidate: Resource) => candidate.id === classId);
        Object.assign(interaction, styleClass?.rules?.[breakpoint]?.[state] ?? {});
      }
      Object.assign(interaction, overrides?.[breakpoint]?.[state] ?? {});
      const interactionBody = declarations(interaction, tokens);
      if (interactionBody) output.push(wrap(`${selector}:${state}{${interactionBody}}`));
    }
  }
  if (type === 'GRID') output.unshift(`${selector}{display:grid;grid-template-columns:repeat(${props.columns ?? 12},minmax(0,1fr))}`);
  if (type === 'COLUMNS') output.unshift(`${selector}{display:grid;grid-template-columns:repeat(${props.columns ?? 2},minmax(0,1fr))}`);
  if (type === 'FLEX') output.unshift(`${selector}{display:flex;flex-direction:${props.direction ?? 'row'};flex-wrap:${props.wrap ?? 'wrap'}}`);
  if (type === 'STACK') output.unshift(`${selector}{display:flex;flex-direction:column}`);
  return output.join('\n');
}

function safeUrl(value: unknown) {
  if (typeof value !== 'string') return undefined;
  if ((value.startsWith('/') && !value.startsWith('//')) || value.startsWith('#')) return value;
  try {
    const url = new URL(value);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) ? value : undefined;
  } catch {
    return undefined;
  }
}

function PreviewNode({ type, values }: { type: string; values: any }) {
  const { puck, id, content: Content } = values;
  const props = values as PortfolioPuckProps;
  const metadata = puck.metadata as Record<string, any>;
  const projects = metadata.projects ?? [];
  const assets = metadata.assets ?? [];
  const links = metadata.links ?? [];
  const linkedComponents = metadata.components ?? [];
  const asset = assets.find((item: Resource) => item.id === props.assetId);
  const project = projects.find((item: Resource) => item.id === props.projectId);
  const tracked = links.find((item: Resource) => item.id === props.trackedLinkId);
  const common = { 'data-portfolio-node': id };
  const children = Content ? <Content minEmptyHeight={72} /> : null;
  const css = rulesFor(props, type, metadata);
  const style = css ? <style>{css}</style> : null;
  const href = puck.isEditing ? undefined : safeUrl(tracked?.destination_url ?? props.href);

  switch (type) {
    case 'SECTION': return <section {...common}>{style}{children}</section>;
    case 'CONTAINER': return <div {...common} style={{ width: 'min(100% - 40px, 1200px)', marginInline: 'auto' }}>{style}{children}</div>;
    case 'GRID': case 'FLEX': case 'COLUMNS': case 'STACK': return <div {...common}>{style}{children}</div>;
    case 'SPACER': return <div {...common} style={{ minHeight: props.height ?? 32 }}>{style}</div>;
    case 'HEADING': {
      const tag = /^h[1-6]$/.test(props.tag ?? '') ? props.tag! : 'h2';
      return React.createElement(tag, common, style, props.text ?? 'Nuevo título');
    }
    case 'TEXT': return <p {...common}>{style}{props.text ?? 'Escribe aquí tu texto.'}</p>;
    case 'IMAGE': return <>{style}<img {...common} src={asset ? `/assets/${asset.storage_key}` : safeUrl(props.nodeProps?.src)} alt={props.alt ?? asset?.alt_text ?? ''} /></>;
    case 'VIDEO': return <>{style}<video {...common} src={asset ? `/assets/${asset.storage_key}` : safeUrl(props.nodeProps?.src)} controls /></>;
    case 'BUTTON': return <a {...common} href={href} className="puck-portfolio-button">{style}{props.text ?? 'Botón'}</a>;
    case 'LINK': return <a {...common} href={href}>{style}{props.text ?? 'Enlace'}</a>;
    case 'CODE': return <pre {...common}>{style}<code>{props.text ?? ''}</code></pre>;
    case 'ICON': return <span {...common} role="img" aria-label={props.label ?? 'Icono'}>{style}{props.symbol ?? '●'}</span>;
    case 'PROJECT': case 'PROJECT_CARD': return <article {...common} className="puck-project-card">{style}<h3>{project?.title ?? 'Selecciona un proyecto'}</h3><p>{project?.summary}</p></article>;
    case 'PROJECT_LIST': {
      const ids = (props.projectIds ?? []).map((item) => item.projectId);
      const selected = ids.length ? projects.filter((item: Resource) => ids.includes(item.id)) : projects;
      return <div {...common} className="puck-project-list">{style}{selected.map((item: Resource) => <article key={item.id}><h3>{item.title}</h3><p>{item.summary}</p></article>)}</div>;
    }
    case 'STATS': return <div {...common} className="puck-stats">{style}{(props.items ?? []).map((item, index) => <div key={index}><strong>{item.value}</strong><span>{item.label}</span></div>)}</div>;
    case 'SOCIAL_LINKS': return <nav {...common} className="puck-social">{style}{(props.links ?? []).map((item, index) => <a key={index} href={puck.isEditing ? undefined : safeUrl(item.url)}>{item.label || item.url}</a>)}</nav>;
    case 'COMPONENT_INSTANCE': {
      const component = linkedComponents.find((item: Resource) => item.document_id === props.componentDocumentId);
      const componentDocument = metadata.componentDocs?.[props.componentDocumentId ?? ''];
      const snapshot = componentDocument ? toSnapshot(componentDocument, metadata.classes ?? [], metadata.tokens ?? [], metadata.projects ?? [], metadata.assets ?? [], metadata.componentDocs ?? {}) : null;
      return <div {...common} className="puck-component-instance">{style}{snapshot ? <PageRenderer snapshot={snapshot} path="/"/> : <><strong>Componente vinculado</strong><span>{component?.name ?? props.componentDocumentId ?? 'Referencia sin resolver'}</span></>}</div>;
    }
    default: return <div {...common}>{style}{type}</div>;
  }
}

function buildConfig(resources: Pick<Props, 'assets' | 'projects' | 'links' | 'classes'>): Config {
  const select = (items: Resource[], label: (item: Resource) => string) => [
    { label: 'Ninguno', value: '' },
    ...items.map((item) => ({ label: label(item), value: item.id })),
  ];
  const styleClassOptions = select(resources.classes, (item) => item.name ?? item.slug);
  const advancedFields: Record<string, any> = {
    analyticsKey: { type: 'text', label: 'Clave de analytics' },
    classes: { type: 'array', label: 'Clases CSS', arrayFields: { styleClassId: { type: 'select', label: 'Clase', options: styleClassOptions } }, defaultItemProps: { styleClassId: '' }, getItemSummary: (item: any) => resources.classes.find((candidate) => candidate.id === item.styleClassId)?.name ?? 'Clase' },
    columnStartDesktop: { type: 'number', label: 'Columna inicial · desktop', min: 1, max: 12 },
    columnSpanDesktop: { type: 'number', label: 'Columnas ocupadas · desktop', min: 1, max: 12 },
    minHeightDesktop: { type: 'number', label: 'Altura mínima · desktop', min: 0 },
    gapDesktop: { type: 'text', label: 'Gap · desktop' },
    propsJson: { type: 'textarea', label: 'Propiedades avanzadas (JSON)' },
    layoutJson: { type: 'textarea', label: 'Layout responsive (JSON)' },
    stylesJson: { type: 'textarea', label: 'Estilos y estados (JSON)' },
  };
  const components: Record<string, any> = {};

  for (const type of [...nodeTypes, 'COMPONENT_INSTANCE']) {
    const fields: Record<string, any> = { ...advancedFields };
    const defaultProps: Record<string, any> = { nodeProps: {}, propsJson: '{}', layoutJson: '{}', stylesJson: '{}', classes: [], analyticsKey: '' };
    if (layoutNodeTypes.has(type)) {
      fields.content = { type: 'slot' };
      defaultProps.content = [];
    }
    if (textTypes.has(type)) {
      fields.text = { type: type === 'TEXT' ? 'richtext' : 'textarea', label: type === 'CODE' ? 'Código' : 'Texto', contentEditable: type !== 'CODE' };
      defaultProps.text = type === 'HEADING' ? 'Nuevo título' : type === 'BUTTON' ? 'Botón' : type === 'LINK' ? 'Enlace' : type === 'TEXT' ? 'Escribe aquí tu texto.' : '';
    }
    if (type === 'HEADING') { fields.tag = { type: 'select', label: 'Nivel', options: [1,2,3,4,5,6].map((level) => ({ label: `H${level}`, value: `h${level}` })) }; defaultProps.tag = 'h2'; }
    if (type === 'BUTTON' || type === 'LINK') {
      fields.href = { type: 'text', label: 'URL' };
      fields.trackedLinkId = { type: 'select', label: 'Enlace trackeado', options: select(resources.links, (item) => item.name) };
      fields.analyticsEventType = { type: 'select', label: 'Evento', options: ['button_click','link_click','demo_open','github_click','contact_click','cv_download'].map((value) => ({ label: value, value })) };
    }
    if (type === 'IMAGE' || type === 'VIDEO') {
      const filtered = resources.assets.filter((asset) => type === 'IMAGE' ? String(asset.mime_type).startsWith('image/') : asset.mime_type === 'video/mp4');
      fields.assetId = { type: 'select', label: type === 'IMAGE' ? 'Imagen' : 'Vídeo', options: select(filtered, (item) => item.original_filename) };
      if (type === 'IMAGE') fields.alt = { type: 'text', label: 'Texto alternativo' };
    }
    if (type === 'GRID' || type === 'COLUMNS') { fields.columns = { type: 'number', label: 'Columnas', min: 1, max: 12 }; defaultProps.columns = type === 'GRID' ? 12 : 2; }
    if (type === 'FLEX') {
      fields.direction = { type: 'select', label: 'Dirección', options: [{ label: 'Fila', value: 'row' }, { label: 'Columna', value: 'column' }] };
      fields.wrap = { type: 'select', label: 'Salto de línea', options: [{ label: 'Permitido', value: 'wrap' }, { label: 'Sin salto', value: 'nowrap' }] };
      defaultProps.direction = 'row'; defaultProps.wrap = 'wrap';
    }
    if (type === 'SPACER') { fields.height = { type: 'number', label: 'Altura', min: 0 }; defaultProps.height = 32; }
    if (type === 'ICON') { fields.symbol = { type: 'text', label: 'Símbolo' }; fields.label = { type: 'text', label: 'Etiqueta accesible' }; defaultProps.symbol = '●'; }
    if (type === 'CODE') fields.language = { type: 'text', label: 'Lenguaje' };
    if (type === 'PROJECT' || type === 'PROJECT_CARD') fields.projectId = { type: 'select', label: 'Proyecto', options: select(resources.projects, (item) => item.title) };
    if (type === 'PROJECT_LIST') fields.projectIds = { type: 'array', label: 'Proyectos', arrayFields: { projectId: { type: 'select', label: 'Proyecto', options: select(resources.projects, (item) => item.title) } }, defaultItemProps: { projectId: '' }, getItemSummary: (item: any) => resources.projects.find((candidate) => candidate.id === item.projectId)?.title ?? 'Proyecto' };
    if (type === 'STATS') fields.items = { type: 'array', label: 'Estadísticas', arrayFields: { value: { type: 'text', label: 'Valor' }, label: { type: 'text', label: 'Etiqueta' } }, defaultItemProps: { value: '', label: '' }, getItemSummary: (item: any) => item.label || item.value || 'Estadística' };
    if (type === 'SOCIAL_LINKS') fields.links = { type: 'array', label: 'Redes', arrayFields: { label: { type: 'text', label: 'Nombre' }, url: { type: 'text', label: 'URL' } }, defaultItemProps: { label: '', url: '' }, getItemSummary: (item: any) => item.label || item.url || 'Red social' };
    if (type === 'COMPONENT_INSTANCE') fields.componentOverridesJson = { type: 'textarea', label: 'Overrides del componente (JSON)' };
    components[type] = { label: labels[type], fields, defaultProps, render: (values: any) => <PreviewNode type={type} values={values} /> };
  }

  return {
    categories: {
      layout: { title: 'Layout', components: ['SECTION','CONTAINER','GRID','FLEX','COLUMNS','STACK','SPACER'], defaultExpanded: true },
      content: { title: 'Contenido', components: ['HEADING','TEXT','IMAGE','VIDEO','BUTTON','LINK','ICON','CODE'], defaultExpanded: true },
      portfolio: { title: 'Portfolio', components: ['PROJECT','PROJECT_LIST','PROJECT_CARD','STATS','SOCIAL_LINKS'] },
      internal: { title: 'Internos', components: ['COMPONENT_INSTANCE'], visible: false },
      other: { visible: false },
    },
    components,
    root: {
      render: ({ children, puck }: any) => {
        const declarations = Object.entries(Object.fromEntries((puck.metadata.tokens ?? []).map((token: Resource) => [token.key, token.value])))
          .map(([key, value]) => `--${key.replace(/[^a-zA-Z0-9_-]/g, '-')}:${String(value).replace(/[;{}]/g, '')}`).join(';');
        return <main className="puck-portfolio-root"><style>{`:root{${declarations}}`}</style>{children}</main>;
      },
    },
  } as Config;
}

function findById(content: ComponentData[], id: string): ComponentData | undefined {
  for (const item of content) {
    if (String(item.props.id) === id) return item;
    for (const value of Object.values(item.props)) {
      if (Array.isArray(value)) {
        const nested = findById(value.filter((candidate): candidate is ComponentData => candidate && typeof candidate === 'object' && 'type' in candidate && 'props' in candidate), id);
        if (nested) return nested;
      }
    }
  }
  return undefined;
}

function selectedNodeId(data: Data, selector: ItemSelector | null) {
  if (!selector) return null;
  const zone = selector.zone ?? 'root:default-zone';
  let content = data.content;
  if (zone !== 'root:default-zone') {
    const separator = zone.indexOf(':');
    const parentId = separator >= 0 ? zone.slice(0, separator) : zone;
    const propName = separator >= 0 ? zone.slice(separator + 1) : 'content';
    const parent = findById(data.content, parentId);
    const nested = parent?.props[propName];
    if (Array.isArray(nested)) content = nested;
  }
  const item = content[selector.index];
  return item ? normalizePuckId(String(item.props.id)) : null;
}

export function PuckEditor(props: Props) {
  const initialData = useMemo(() => documentToPuckData(props.document), []);
  const config = useMemo(() => buildConfig(props), [props.assets, props.projects, props.links, props.classes]);
  const baseDocument = useRef(props.document);
  const latestData = useRef<Data>(initialData);
  const revision = useRef(props.document.document.revision);
  const changeVersion = useRef(0);
  const savedVersion = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const mounted = useRef(true);
  const callbacks = useRef(props);
  callbacks.current = props;

  const persist = useCallback(async (): Promise<void> => {
    if (inFlight.current) {
      await inFlight.current;
      if (savedVersion.current < changeVersion.current) return persist();
      return;
    }
    if (savedVersion.current >= changeVersion.current) return;
    const targetVersion = changeVersion.current;
    const data = latestData.current;
    const currentDocument = baseDocument.current;
    const task = (async () => {
      try {
        const saved = await api<DocumentPayload>(`admin/documents/${currentDocument.document.id}/nodes`, {
          method: 'PUT',
          body: JSON.stringify({ revision: revision.current, nodes: puckDataToNodes(data, currentDocument) }),
        });
        revision.current = saved.document.revision;
        baseDocument.current = saved;
        savedVersion.current = targetVersion;
        if (targetVersion === changeVersion.current) {
          callbacks.current.onSaved(saved);
          callbacks.current.onMessage('Guardado');
        }
      } catch (error) {
        if (error instanceof ApiError && (error.status === 409 || error.status === 422)) {
          const fresh = await api<DocumentPayload>(`admin/documents/${currentDocument.document.id}`);
          revision.current = fresh.document.revision;
          baseDocument.current = fresh;
          savedVersion.current = changeVersion.current;
          callbacks.current.onReload(fresh, error.status === 409 ? 'Conflicto de edición: se cargó la versión más reciente' : `Cambio rechazado: ${error.message}`);
        } else {
          callbacks.current.onMessage(`Cambios pendientes sin guardar: ${String(error)}`);
          throw error;
        }
      }
    })();
    inFlight.current = task;
    try { await task; }
    finally {
      inFlight.current = null;
      if (mounted.current && savedVersion.current >= changeVersion.current) callbacks.current.onSavingChange(false);
    }
    if (savedVersion.current < changeVersion.current) return persist();
  }, []);

  useEffect(() => () => {
    mounted.current = false;
    if (timer.current) clearTimeout(timer.current);
    if (savedVersion.current < changeVersion.current) void persist().catch(() => undefined);
  }, [persist]);

  const changed = (data: Data) => {
    latestData.current = data;
    changeVersion.current += 1;
    props.onSavingChange(true);
    props.onLocalChange(puckDataToDocument(data, baseDocument.current));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist().catch(() => undefined), 700);
  };

  return <div className="puck-editor-host">
    <Puck
      config={config}
      data={initialData}
      metadata={{ assets: props.assets, projects: props.projects, links: props.links, classes: props.classes, tokens: props.tokens, components: props.components, componentDocs: props.componentDocs }}
      viewports={[
        { width: 1440, height: 'auto', label: 'Desktop' },
        { width: 768, height: 'auto', label: 'Tablet' },
        { width: 390, height: 'auto', label: 'Móvil' },
      ]}
      iframe={{ enabled: false }}
      dnd={{ behavior: 'auto' }}
      headerTitle={props.document.page?.title ?? props.document.document.name}
      headerPath={props.document.page ? `/${props.document.page.slug}` : `Componente / ${props.document.component?.key ?? ''}`}
      dictionary={{ 'header-publish': 'Guardar y publicar' } as any}
      onChange={changed}
      onAction={(_action, appState) => props.onSelectionChange(selectedNodeId(appState.data, appState.ui.itemSelector))}
      onPublish={async (data) => {
        changed(data);
        if (timer.current) clearTimeout(timer.current);
        await persist();
        await props.onPublish();
      }}
      height="100vh"
    />
  </div>;
}
