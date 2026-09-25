import React, { type CSSProperties, type ReactNode } from 'react';

export type Breakpoint = 'desktop' | 'tablet' | 'mobile';
export type ResizeChange = { columnStart?: number; columnSpan?: number; minHeight?: number };
export type Node = {
  id: string; parentId: string | null; type: string; position: number;
  props: Record<string, any>; layout: Record<string, any>;
  styles: Record<string, any>; classes: string[]; analyticsKey?: string | null;
};
export type Snapshot = {
  schemaVersion: number;
  publication?: { version: number };
  theme: { tokens: Record<string, any> };
  styles: Record<string, Record<string, Record<string, Record<string, any>>>>;
  pages: Record<string, { id: string; title: string; seoTitle?: string; seoDescription?: string; rootNodes: string[] }>;
  nodes: Record<string, Node>;
  projects: Record<string, any>;
  assets: Record<string, { url: string; alt?: string }>;
  trackedLinks: Record<string, string>;
};

const propertyNames: Record<string, string> = {
  background: 'background', backgroundColor: 'backgroundColor', color: 'color',
  fontSize: 'fontSize', fontWeight: 'fontWeight', fontFamily: 'fontFamily',
  lineHeight: 'lineHeight', letterSpacing: 'letterSpacing', textAlign: 'textAlign',
  padding: 'padding', paddingTop: 'paddingTop', paddingRight: 'paddingRight', paddingBottom: 'paddingBottom', paddingLeft: 'paddingLeft',
  margin: 'margin', marginTop: 'marginTop', marginRight: 'marginRight', marginBottom: 'marginBottom', marginLeft: 'marginLeft',
  width: 'width', maxWidth: 'maxWidth', minHeight: 'minHeight', height: 'height',
  border: 'border', borderRadius: 'borderRadius', boxShadow: 'boxShadow', opacity: 'opacity',
  gap: 'gap', alignItems: 'alignItems', justifyContent: 'justifyContent',
  gridColumn: 'gridColumn', gridRow: 'gridRow', overflow: 'overflow', display: 'display',
};

function valueFor(value: any, tokens: Record<string, any>, seen: Set<string> = new Set()): string | number | undefined {
  const key = typeof value === 'string' && value.startsWith('$') ? value.slice(1) : typeof value === 'string' && Object.hasOwn(tokens, value) ? value : undefined;
  if (key) {
    if (seen.has(key)) return undefined;
    return valueFor(tokens[key], tokens, new Set(seen).add(key));
  }
  if (typeof value === 'number' || typeof value === 'string') return value;
  return undefined;
}

function safeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  if ((value.startsWith('/') && !value.startsWith('//')) || value.startsWith('#')) return value;
  try { const url = new URL(value); if (['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol)) return value; }
  catch { /* Invalid URL. */ }
  return undefined;
}

function properties(raw: Record<string, any> | undefined, tokens: Record<string, any>): CSSProperties {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(raw ?? {})) {
    if (propertyNames[key]) result[propertyNames[key]] = valueFor(value, tokens);
  }
  return result as CSSProperties;
}

function current<T>(value: T | Record<Breakpoint, T>, breakpoint: Breakpoint): T {
  if (value && typeof value === 'object' && ('desktop' in value || 'tablet' in value || 'mobile' in value)) {
    const responsive = value as Record<Breakpoint, T>;
    return responsive[breakpoint] ?? (breakpoint === 'mobile' ? responsive.tablet : undefined) ?? responsive.desktop;
  }
  return value as T;
}

function nodeStyle(node: Node, snapshot: Snapshot, breakpoint: Breakpoint): CSSProperties {
  const tokens = snapshot.theme.tokens;
  const result: CSSProperties = {};
  for (const name of node.classes) {
    const rules = snapshot.styles[name];
    Object.assign(result, properties(rules?.desktop?.default, tokens));
    if (breakpoint !== 'desktop') Object.assign(result, properties(rules?.tablet?.default, tokens));
    if (breakpoint === 'mobile') Object.assign(result, properties(rules?.mobile?.default, tokens));
  }
  const responsive = node.styles;
  Object.assign(result, properties(responsive?.desktop?.default, tokens));
  if (breakpoint !== 'desktop') Object.assign(result, properties(responsive?.tablet?.default, tokens));
  if (breakpoint === 'mobile') Object.assign(result, properties(responsive?.mobile?.default, tokens));
  const layout = node.layout ?? {};
  const span = current(layout.columnSpan, breakpoint);
  const start = current(layout.columnStart, breakpoint);
  if (span) result.gridColumn = start ? `${start} / span ${span}` : `span ${span}`;
  if (layout.gap !== undefined) result.gap = valueFor(current(layout.gap, breakpoint), tokens);
  if (layout.minHeight !== undefined) result.minHeight = valueFor(current(layout.minHeight, breakpoint), tokens);
  if (layout.alignItems !== undefined) result.alignItems = current(layout.alignItems, breakpoint);
  if (layout.justifyContent !== undefined) result.justifyContent = current(layout.justifyContent, breakpoint);
  return result;
}

function interactionCSS(snapshot: Snapshot, breakpoint: Breakpoint): string {
  const result: string[] = [];
  for (const node of Object.values(snapshot.nodes)) {
    for (const state of ['hover', 'focus'] as const) {
      const merged: Record<string, any> = {};
      for (const name of node.classes) {
        const rules = snapshot.styles[name];
        Object.assign(merged, rules?.desktop?.[state]);
        if (breakpoint !== 'desktop') Object.assign(merged, rules?.tablet?.[state]);
        if (breakpoint === 'mobile') Object.assign(merged, rules?.mobile?.[state]);
      }
      Object.assign(merged, node.styles?.desktop?.[state]);
      if (breakpoint !== 'desktop') Object.assign(merged, node.styles?.tablet?.[state]);
      if (breakpoint === 'mobile') Object.assign(merged, node.styles?.mobile?.[state]);
      const css = Object.entries(properties(merged, snapshot.theme.tokens)).map(([key, value]) => `${key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase())}:${String(value).replace(/[;{}]/g, '')}!important`).join(';');
      if (css) result.push(`[data-node-id="${node.id}"]:${state}{${css}}`);
    }
  }
  return result.join('\n');
}

function tokenCSS(tokens: Record<string, any>): string {
  const declarations = Object.entries(tokens).map(([key, value]) => {
    const resolved = valueFor(value, tokens);
    return resolved === undefined ? '' : `--${key.replace(/[^a-zA-Z0-9_-]/g, '-')}:${String(resolved).replace(/[;{}]/g, '')}`;
  }).filter(Boolean).join(';');
  return declarations ? `:root{${declarations}}` : '';
}

export function NodeRenderer({ id, snapshot, breakpoint = 'desktop', onSelect, selectedId, onResize, onContextMenu }: {
  id: string; snapshot: Snapshot; breakpoint?: Breakpoint; onSelect?: (id: string) => void; selectedId?: string; onResize?: (id: string, change: ResizeChange) => void; onContextMenu?: (id: string, x: number, y: number) => void;
}): ReactNode {
  const node = snapshot.nodes[id];
  if (!node) return null;
  const children = Object.values(snapshot.nodes).filter(item => item.parentId === id).sort((a, b) => a.position - b.position)
    .map(item => <NodeRenderer key={item.id} id={item.id} snapshot={snapshot} breakpoint={breakpoint} onSelect={onSelect} selectedId={selectedId} onResize={onResize} onContextMenu={onContextMenu} />);
  const p = node.props ?? {};
  const style = nodeStyle(node, snapshot, breakpoint);
  const select = onSelect ? (event: React.MouseEvent) => { event.stopPropagation(); event.preventDefault(); onSelect(id); } : undefined;
  const pointerDown = onResize ? (event: React.PointerEvent) => {
    if (selectedId !== id) return;
    const element = event.currentTarget as HTMLElement, rect = element.getBoundingClientRect();
    const resizeLeft = event.clientX - rect.left <= 14;
    const resizeRight = rect.right - event.clientX <= 14;
    const resizeBottom = rect.bottom - event.clientY <= 14;
    if (!resizeLeft && !resizeRight && !resizeBottom) return;
    event.stopPropagation(); event.preventDefault();
    const parentWidth = element.parentElement?.getBoundingClientRect().width || rect.width;
    const gridWidth = Math.max(1, parentWidth / 12);
    const startX = event.clientX, startY = event.clientY;
    const startSpan = Number(current(node.layout?.columnSpan, breakpoint) ?? 12);
    const startColumn = Number(current(node.layout?.columnStart, breakpoint) ?? 1);
    const startHeight = rect.height;
    const originalGridColumn = element.style.gridColumn, originalMinHeight = element.style.minHeight;
    const pointerId = event.pointerId;
    element.setPointerCapture(pointerId);
    const calculate = (pointer: PointerEvent): ResizeChange => {
      const horizontal = Math.round((pointer.clientX - startX) / gridWidth);
      const change: ResizeChange = {};
      if (resizeRight) change.columnSpan = Math.min(13 - startColumn, Math.max(1, startSpan + horizontal));
      if (resizeLeft) {
        const columnStart = Math.min(startColumn + startSpan - 1, Math.max(1, startColumn + horizontal));
        change.columnStart = columnStart;
        change.columnSpan = Math.max(1, startSpan - (columnStart - startColumn));
      }
      if (resizeBottom) change.minHeight = Math.max(8, Math.round((startHeight + pointer.clientY - startY) / 8) * 8);
      return change;
    };
    const preview = (move: PointerEvent) => {
      const change = calculate(move);
      if (change.columnSpan) element.style.gridColumn = `${change.columnStart ?? startColumn} / span ${change.columnSpan}`;
      if (change.minHeight) element.style.minHeight = `${change.minHeight}px`;
    };
    const cleanup = () => {
      element.removeEventListener('pointermove', preview);
      element.removeEventListener('pointerup', finish);
      element.removeEventListener('pointercancel', cancel);
    };
    const finish = (up: PointerEvent) => {
      const change = calculate(up);
      cleanup();
      element.style.gridColumn = originalGridColumn; element.style.minHeight = originalMinHeight;
      if (change.columnSpan !== startSpan || change.columnStart !== undefined && change.columnStart !== startColumn || change.minHeight !== undefined && change.minHeight !== startHeight) onResize(id, change);
    };
    const cancel = () => { cleanup(); element.style.gridColumn = originalGridColumn; element.style.minHeight = originalMinHeight; };
    element.addEventListener('pointermove', preview);
    element.addEventListener('pointerup', finish);
    element.addEventListener('pointercancel', cancel);
  } : undefined;
  const contextMenu = onContextMenu ? (event: React.MouseEvent) => { event.preventDefault(); event.stopPropagation(); onContextMenu(id, event.clientX, event.clientY); } : undefined;
  const common = { style, onClick: select, onPointerDown: pointerDown, onContextMenu: contextMenu, 'data-node-id': id, className: selectedId === id ? 'is-selected-node' : undefined };
  const href = safeUrl(p.tracked_link_id ? snapshot.trackedLinks[p.tracked_link_id] : p.href);
  switch (node.type) {
    case 'SECTION': return <section {...common}>{children}</section>;
    case 'CONTAINER': return <div {...common} style={{ width: 'min(100% - 40px, 1200px)', marginInline: 'auto', ...style }}>{children}</div>;
    case 'GRID': return <div {...common} style={{ display: 'grid', gridTemplateColumns: `repeat(${p.columns ?? 12}, minmax(0, 1fr))`, ...style }}>{children}</div>;
    case 'FLEX': return <div {...common} style={{ display: 'flex', flexDirection: p.direction ?? 'row', flexWrap: p.wrap ?? 'wrap', ...style }}>{children}</div>;
    case 'STACK': return <div {...common} style={{ display: 'flex', flexDirection: 'column', ...style }}>{children}</div>;
    case 'COLUMNS': return <div {...common} style={{ display: 'grid', gridTemplateColumns: `repeat(${p.columns ?? 2}, minmax(0, 1fr))`, ...style }}>{children}</div>;
    case 'SPACER': return <div {...common} style={{ minHeight: p.height ?? 32, ...style }} />;
    case 'HEADING': {
      const tag = /^h[1-6]$/.test(p.tag) ? p.tag : 'h2';
      return React.createElement(tag, common, p.text ?? 'Heading');
    }
    case 'TEXT': return <p {...common}>{p.text ?? 'Text'}</p>;
    case 'IMAGE': {
      const asset = snapshot.assets[p.asset_id];
      return <img {...common} src={safeUrl(asset?.url ?? p.src)} alt={p.alt ?? asset?.alt ?? ''} />;
    }
    case 'VIDEO': return <video {...common} src={safeUrl(snapshot.assets[p.asset_id]?.url ?? p.src)} poster={safeUrl(snapshot.assets[p.poster_asset_id]?.url)} controls />;
    case 'BUTTON': return <a {...common} href={href ?? '#'}>{p.text ?? 'Button'}</a>;
    case 'LINK': return <a {...common} href={href ?? '#'}>{p.text ?? 'Link'}</a>;
    case 'CODE': return <pre {...common}><code>{p.text ?? ''}</code></pre>;
    case 'ICON': return <span {...common} role="img" aria-label={p.label ?? 'Icon'}>{p.symbol ?? '●'}</span>;
    case 'STATS': return <div {...common} className={[common.className, 'portfolio-stats'].filter(Boolean).join(' ')}>{(Array.isArray(p.items) ? p.items : []).map((item: any, index: number) => <div key={index}><strong>{item.value}</strong><span>{item.label}</span></div>)}</div>;
    case 'SOCIAL_LINKS': return <nav {...common} aria-label="Redes sociales" className={[common.className, 'portfolio-social'].filter(Boolean).join(' ')}>{(Array.isArray(p.links) ? p.links : []).map((item: any, index: number) => <a key={index} href={safeUrl(item.url) ?? '#'} rel="noopener noreferrer">{item.label ?? item.url}</a>)}</nav>;
    case 'PROJECT': case 'PROJECT_CARD': {
      const project = snapshot.projects[p.project_id];
      const cover = snapshot.assets[project?.cover_asset_id];
      return <article {...common} className={[common.className, 'portfolio-project'].filter(Boolean).join(' ')}>{cover && <img src={cover.url} alt={cover.alt ?? project?.title ?? ''}/>}<h3>{project?.title ?? 'Project'}</h3><p>{project?.summary}</p></article>;
    }
    case 'PROJECT_LIST': {
      const projects = Object.values(snapshot.projects).filter(project => !Array.isArray(p.project_ids) || p.project_ids.includes(project.id)).sort((a, b) => Number(a.position) - Number(b.position));
      return <div {...common} className={[common.className, 'portfolio-project-list'].filter(Boolean).join(' ')}>{projects.map(project => <article className="portfolio-project" key={project.id}>{snapshot.assets[project.cover_asset_id] && <img src={snapshot.assets[project.cover_asset_id].url} alt={snapshot.assets[project.cover_asset_id].alt ?? project.title}/>}<h3>{project.title}</h3><p>{project.summary}</p></article>)}</div>;
    }
    default: return <div {...common}>{p.text ?? node.type}{children}</div>;
  }
}

export function PageRenderer({ snapshot, path, breakpoint, onSelect, selectedId, onResize, onContextMenu }: {
  snapshot: Snapshot; path: string; breakpoint?: Breakpoint; onSelect?: (id: string) => void; selectedId?: string; onResize?: (id: string, change: ResizeChange) => void; onContextMenu?: (id: string, x: number, y: number) => void;
}) {
  const page = snapshot.pages[path];
  if (!page) return <main><h1>Page not found</h1></main>;
  return <main><style>{tokenCSS(snapshot.theme.tokens)}{interactionCSS(snapshot, breakpoint ?? 'desktop')}</style>{page.rootNodes.map(id => <NodeRenderer key={id} id={id} snapshot={snapshot} breakpoint={breakpoint} onSelect={onSelect} selectedId={selectedId} onResize={onResize} onContextMenu={onContextMenu} />)}</main>;
}
