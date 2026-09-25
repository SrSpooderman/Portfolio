import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageRenderer, type Breakpoint, type Node, type Snapshot } from '@portfolio/renderer';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Copy, FilePlus2, Grid3X3, History, Layers3, Link2, LogOut, Monitor, Plus, Redo2, Shield, Smartphone, Tablet, Trash2, Undo2, UploadCloud, WandSparkles } from 'lucide-react';
import { api, ApiError, login, logout, restoreSession } from './api';
import type { ComponentOverride, DocumentPayload, EditorNode } from './editor-types';
import { nodeTypes } from './editor-types';
import { documentsQuery, queryKeys, resourcesQuery } from './queries';
import { CreatePageDialog } from './ui-dialogs';
import { ProjectDndList } from './ProjectDndList';
import './style.css';
import './extras.css';

const PuckEditor = React.lazy(() => import('./PuckEditor').then((module) => ({ default: module.PuckEditor })));
const ModernAssetsPanel = React.lazy(() => import('./AssetsPanel').then(module => ({ default: module.AssetsPanel })));
const AnalyticsCharts = React.lazy(() => import('./AnalyticsCharts').then(module => ({ default: module.AnalyticsCharts })));

function responsiveValue(value: any, breakpoint: Breakpoint) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value[breakpoint] ?? (breakpoint === 'mobile' ? value.tablet : undefined) ?? value.desktop ?? '';
  return value ?? '';
}

function responsiveUpdate(value: any, breakpoint: Breakpoint, next: any) {
  const result = value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : value === undefined || value === '' ? {} : { desktop: value };
  result[breakpoint] = next;
  return result;
}

function toSnapshot(document: DocumentPayload, classes: any[], tokens: any[], projects: any[], assets: any[], componentDocs: Record<string, DocumentPayload>): Snapshot {
  const nodes: Record<string, Node> = {};
  for (const source of Object.values(document.nodes)) nodes[source.id] = {
    id: source.id, parentId: source.parent_id, type: source.node_type === 'COMPONENT_INSTANCE' ? 'STACK' : source.node_type, position: source.position,
    props: source.props ?? {}, layout: source.layout ?? {}, styles: source.style_overrides ?? {}, classes: (source.classes ?? []).map(id => classes.find(c => c.id === id)?.slug ?? id), analyticsKey: source.analytics_key
  };
  for (const instance of Object.values(document.nodes).filter(node => node.node_type === 'COMPONENT_INSTANCE')) {
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
      nodes[id] = { id, parentId: componentNode.parent_id ? `${instance.id}:${componentNode.parent_id}` : instance.id, type: componentNode.node_type, position: componentNode.position, props: { ...(componentNode.props ?? {}), ...(override?.props_override ?? {}) }, layout: componentNode.layout ?? {}, styles: { ...(componentNode.style_overrides ?? {}), ...(override?.style_override ?? {}) }, classes: classIds.map(classId => classes.find(c => c.id === classId)?.slug ?? classId), analyticsKey: componentNode.analytics_key };
    }
  }
  return { schemaVersion: 1, theme: { tokens: Object.fromEntries(tokens.map(t => [t.key, t.value])) }, styles: Object.fromEntries(classes.map(c => [c.slug, c.rules ?? {}])),
    pages: { '/': { id: document.document.id, title: document.page?.title ?? document.document.name, rootNodes: document.root_nodes } }, nodes,
    projects: Object.fromEntries(projects.map(p => [p.id, p])), assets: Object.fromEntries(assets.map(a => [a.id, { url: '/assets/' + a.storage_key, alt: a.alt_text }])), trackedLinks: {} };
}

function treePackage(document: DocumentPayload, rootId: string) {
  const selected = new Set([rootId]);
  let size = 0;
  while (size !== selected.size) {
    size = selected.size;
    for (const node of Object.values(document.nodes)) if (node.parent_id && selected.has(node.parent_id)) selected.add(node.id);
  }
  const nodes = Object.values(document.nodes).filter(node => selected.has(node.id));
  return { schema_version: 1, root_id: rootId, nodes, classes: Object.fromEntries(nodes.map(node => [node.id, (node.classes ?? []).map((id, position) => [id, position])])) };
}

function downloadJSON(filename: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState('');
  return <div className="login-screen"><form className="login-card" onSubmit={async event => { event.preventDefault(); try { await login(email, password); onDone(); } catch (e) { setError(String(e)); } }}>
    <div className="brand-mark">P</div><h1>Portfolio Studio</h1><p>Accede a tu espacio de edición.</p>
    <label>Correo electrónico<input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
    <label>Contraseña<input type="password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
    {error && <div className="error">{error}</div>}<button className="primary" type="submit">Entrar al estudio</button>
  </form></div>;
}

function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [createPageOpen, setCreatePageOpen] = useState(false);
  const queryClient = useQueryClient();
  const pagesResult = useQuery(documentsQuery(authenticated === true));
  const resourcesResult = useQuery(resourcesQuery(authenticated === true));
  const pages = pagesResult.data ?? [];
  const resources = resourcesResult.data;
  const classes = resources?.classes ?? [];
  const tokens = resources?.tokens ?? [];
  const projects = resources?.projects ?? [];
  const assets = resources?.assets ?? [];
  const technologies = resources?.technologies ?? [];
  const components = resources?.components ?? [];
  const templates = resources?.templates ?? [];
  const componentDocs = resources?.componentDocs ?? {};
  const links = resources?.links ?? [];
  const publications = resources?.publications ?? [];
  const [document, setDocument] = useState<DocumentPayload | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [componentTargetId, setComponentTargetId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');
  const [styleState, setStyleState] = useState<'default' | 'hover' | 'focus'>('default');
  const [zoom, setZoom] = useState(1);
  const [showGuides, setShowGuides] = useState(false);
  const [tab, setTab] = useState<'pages' | 'components' | 'styles' | 'projects' | 'assets' | 'links' | 'analytics' | 'publications' | 'account'>('pages');
  const [message, setMessage] = useState(''); const [saving, setSaving] = useState(false);
  const [puckEpoch, setPuckEpoch] = useState(0);
  const [history, setHistory] = useState<DocumentPayload[]>([]); const [future, setFuture] = useState<DocumentPayload[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workingDocument = useRef<DocumentPayload | null>(null);
  const savedDocument = useRef<DocumentPayload | null>(null);
  const saveInFlight = useRef(false);
  const saveRetries = useRef(0);
  const clipboard = useRef<any>(null);

  const loadList = useCallback(async () => { await queryClient.invalidateQueries({ queryKey: queryKeys.documents }); }, [queryClient]);
  const loadResources = useCallback(async () => { await queryClient.invalidateQueries({ queryKey: queryKeys.resources }); }, [queryClient]);
  useEffect(() => { restoreSession().then(setAuthenticated); }, []);
  useEffect(() => {
    const error = pagesResult.error ?? resourcesResult.error;
    if (error) setMessage(String(error));
  }, [pagesResult.error, resourcesResult.error]);
  const openPage = async (id: string) => { if (saveTimer.current) clearTimeout(saveTimer.current); const result = await api<DocumentPayload>('admin/documents/' + id); workingDocument.current = result; savedDocument.current = result; setDocument(result); setSelectedId(null); setComponentTargetId(null); setHistory([]); setFuture([]); setSaving(false); setPuckEpoch(value => value + 1); };
  const snapshot = useMemo(() => document ? toSnapshot(document, classes, tokens, projects, assets, componentDocs) : null, [document, classes, tokens, projects, assets, componentDocs]);
  const selected = selectedId ? document?.nodes[selectedId] : undefined;
  const selectedComponentDocument = selected?.component_document_id ? componentDocs[selected.component_document_id] : undefined;
  const componentTarget = componentTargetId ? selectedComponentDocument?.nodes[componentTargetId] : undefined;
  const componentOverride = componentTargetId ? selected?.component_overrides?.[componentTargetId] ?? {} : {};

  const acceptStructuralChange = async (previous: DocumentPayload, nextSelectedId: string | null) => {
    const result = await api<DocumentPayload>('admin/documents/' + previous.document.id);
    workingDocument.current = result; savedDocument.current = result; setDocument(result);
    setPuckEpoch(value => value + 1);
    setHistory(items => [...items.slice(-9), structuredClone(previous)]); setFuture([]); setSaving(false);
    setSelectedId(nextSelectedId && result.nodes[nextSelectedId] ? nextSelectedId : null); setComponentTargetId(null);
  };
  const saveComponentOverride = async (targetId: string, body: Partial<ComponentOverride>) => {
    if (!document || !selected || saving) return;
    const previous = document;
    try {
      await api(`admin/component-instances/${selected.id}/nodes/${targetId}`, { method: 'PATCH', headers: { 'If-Match': String(document.document.revision) }, body: JSON.stringify(body) });
      await acceptStructuralChange(previous, selected.id); setComponentTargetId(targetId); setMessage('Override guardado');
    } catch(error) { setMessage(String(error)); }
  };
  const saveComponentClasses = async (targetId: string, changes: ComponentOverride['class_changes']) => {
    if (!document || !selected || saving) return;
    const previous = document;
    try {
      await api(`admin/component-instances/${selected.id}/nodes/${targetId}/style-classes`, { method: 'PUT', headers: { 'If-Match': String(document.document.revision) }, body: JSON.stringify({ changes: changes ?? [] }) });
      await acceptStructuralChange(previous, selected.id); setComponentTargetId(targetId); setMessage('Clases de instancia guardadas');
    } catch(error) { setMessage(String(error)); }
  };
  const assignNodeClasses = async (node: EditorNode, slugs: string[]) => {
    if (!document || saving) return;
    const previous = document;
    try {
      await api(`admin/nodes/${node.id}/style-classes`, { method: 'PUT', headers: { 'If-Match': String(document.document.revision) }, body: JSON.stringify({ classes: slugs }) });
      await acceptStructuralChange(previous, node.id); setMessage('Clases guardadas');
    } catch(error) { setMessage(String(error)); }
  };

  const flushSave = async () => {
    if (saveInFlight.current) return;
    const working = workingDocument.current, saved = savedDocument.current;
    if (!working || !saved || working.document.id !== saved.document.id) return;
    const changes = Object.values(working.nodes).filter(node => JSON.stringify(node) !== JSON.stringify(saved.nodes[node.id])).map(node => ({ id: node.id, parent_id: node.parent_id, position: node.position, props: node.props, layout: node.layout, style_overrides: node.style_overrides, analytics_key: node.analytics_key ?? null }));
    if (!changes.length) { setSaving(false); return; }
    saveInFlight.current = true;
    try {
      const result = await api<DocumentPayload>(`admin/documents/${working.document.id}/nodes`, { method: 'PATCH', body: JSON.stringify({ revision: saved.document.revision, changes }) });
      if (workingDocument.current?.document.id !== result.document.id) return;
      savedDocument.current = result;
      saveRetries.current = 0;
      if (workingDocument.current === working) { workingDocument.current = result; setDocument(result); setSaving(false); setMessage('Guardado'); }
      else { const pending = workingDocument.current; if (pending && pending.document.id === result.document.id) { pending.document.revision = result.document.revision; setDocument({ ...pending }); } }
    } catch(e) {
      if (e instanceof ApiError && (e.status === 409 || e.status === 422) && workingDocument.current) {
        try { const fresh = await api<DocumentPayload>('admin/documents/' + workingDocument.current.document.id); workingDocument.current = fresh; savedDocument.current = fresh; setDocument(fresh); setHistory([]); setFuture([]); setSaving(false); setMessage(e.status === 409 ? 'Conflicto de edición: se cargó la versión más reciente' : `Cambio rechazado: ${e.message}`); }
        catch { setSaving(true); setMessage(`Error al recuperar el documento: ${e.message}`); }
      } else if (saveRetries.current < 3) { saveRetries.current += 1; setSaving(true); setMessage(`Error al guardar; reintento ${saveRetries.current}/3`); saveTimer.current = setTimeout(() => void flushSave(), 1500 * saveRetries.current); }
      else { setSaving(true); setMessage(`Cambios pendientes sin guardar: ${String(e)}`); }
    }
    finally { saveInFlight.current = false; if (workingDocument.current !== savedDocument.current && workingDocument.current !== working) saveTimer.current = setTimeout(() => void flushSave(), 100); }
  };
  const commit = (next: DocumentPayload) => {
    const previous = workingDocument.current;
    if (!previous) return;
    workingDocument.current = next; saveRetries.current = 0;
    setDocument(next); setHistory(items => [...items.slice(-9), previous]); setFuture([]); setSaving(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void flushSave(), 700);
  };
  const updateNode = (id: string, patch: Partial<EditorNode>) => {
    const current = workingDocument.current;
    if (!current) return;
    const next = structuredClone(current); Object.assign(next.nodes[id], patch); commit(next);
  };
  const createPage = async ({ title, slug, is_home }: { title: string; slug: string; is_home: boolean }) => {
    try { const created = await api<DocumentPayload>('admin/pages', { method: 'POST', body: JSON.stringify({ title, slug, is_home }) }); await loadList(); workingDocument.current = created; savedDocument.current = created; setDocument(created); setTab('pages'); }
    catch (e) { setMessage(String(e)); }
  };
  const addNode = async (type: string) => {
    if (!document || saving) { setMessage('Espera a que termine el guardado'); return; }
    const previous = document;
    const parent = selected && ['SECTION','CONTAINER','GRID','FLEX','STACK','COLUMNS'].includes(selected.node_type) ? selected.id : selected?.parent_id ?? null;
    const siblings = Object.values(document.nodes).filter(n => n.parent_id === parent);
    const props = type === 'HEADING' ? { text: 'Nuevo título', tag: 'h2' } : type === 'TEXT' ? { text: 'Escribe aquí tu texto.' } : type === 'BUTTON' ? { text: 'Botón', href: '#' } : {};
    try { const response = await api<any>(`admin/documents/${document.document.id}/nodes`, { method: 'POST', headers: { 'If-Match': String(document.document.revision) }, body: JSON.stringify({ node_type: type, parent_id: parent, position: Math.max(0, ...siblings.map(n => Number(n.position))) + 10, props }) }); await acceptStructuralChange(previous, response.node.id); }
    catch (e) { setMessage(String(e)); }
  };
  const deleteSelected = async () => {
    if (!document || !selected || saving) return;
    const previous = document;
    try { await api(`admin/nodes/${selected.id}`, { method: 'DELETE', headers: { 'If-Match': String(document.document.revision) } }); await acceptStructuralChange(previous, null); }
    catch (e) { setMessage(String(e)); }
  };
  const duplicateSelected = async () => {
    if (!document || !selected || saving) return;
    const previous = document;
    try { const result = await api<any>(`admin/nodes/${selected.id}/duplicates`, { method: 'POST', headers: { 'If-Match': String(document.document.revision) } }); await acceptStructuralChange(previous, result.root_id); }
    catch (e) { setMessage(String(e)); }
  };
  const copySelected = () => { if (!document || !selected) return; clipboard.current = treePackage(document, selected.id); setMessage('Bloque copiado'); };
  const pasteCopied = async () => {
    if (!document || !clipboard.current || saving) return;
    const previous = document;
    const parent = selected && ['SECTION','CONTAINER','GRID','FLEX','STACK','COLUMNS'].includes(selected.node_type) ? selected.id : selected?.parent_id ?? null;
    try { const result = await api<any>(`admin/documents/${document.document.id}/nodes/import`, { method: 'POST', headers: { 'If-Match': String(document.document.revision) }, body: JSON.stringify({ package: clipboard.current, parent_id: parent }) }); await acceptStructuralChange(previous, result.root_id); }
    catch(e) { setMessage(String(e)); }
  };
  const createComponent = async () => {
    if (!selected) return;
    const name = prompt('Nombre del componente'); if (!name) return;
    try { await api('admin/components', { method: 'POST', body: JSON.stringify({ name, key: name.toLowerCase().replace(/\s+/g, '-'), source_node_id: selected.id }) }); await loadResources(); setMessage('Componente creado'); }
    catch(e) { setMessage(String(e)); }
  };
  const createTemplate = async () => {
    if (!document || !selected) return;
    const name = prompt('Nombre del template'); if (!name) return;
    try { await api('admin/templates', { method: 'POST', body: JSON.stringify({ name, template_type: 'SECTION', snapshot: treePackage(document, selected.id) }) }); await loadResources(); setMessage('Template guardado'); }
    catch(e) { setMessage(String(e)); }
  };
  const insertComponent = async (componentId: string) => {
    if (!document || saving) return;
    const previous = document;
    const parent = selected && ['SECTION','CONTAINER','GRID','FLEX','STACK','COLUMNS'].includes(selected.node_type) ? selected.id : selected?.parent_id ?? null;
    try { const result = await api<any>(`admin/documents/${document.document.id}/component-instances`, { method: 'POST', headers: { 'If-Match': String(document.document.revision) }, body: JSON.stringify({ component_document_id: componentId, parent_id: parent }) }); await acceptStructuralChange(previous, result.node.id); }
    catch(e) { setMessage(String(e)); }
  };
  const insertTemplate = async (templateId: string) => {
    if (!document || saving) return;
    const previous = document;
    const parent = selected && ['SECTION','CONTAINER','GRID','FLEX','STACK','COLUMNS'].includes(selected.node_type) ? selected.id : selected?.parent_id ?? null;
    try { const result = await api<any>(`admin/documents/${document.document.id}/template-instances`, { method: 'POST', headers: { 'If-Match': String(document.document.revision) }, body: JSON.stringify({ template_id: templateId, parent_id: parent }) }); await acceptStructuralChange(previous, result.root_id); }
    catch(e) { setMessage(String(e)); }
  };
  const detachSelected = async () => {
    if (!document || !selected || saving) return;
    const previous = document;
    try { const response = await api<any>(`admin/component-instances/${selected.id}/detachments`, { method: 'POST', headers: { 'If-Match': String(document.document.revision) } }); await acceptStructuralChange(previous, response.root_ids?.[0] ?? null); setMessage('Instancia desvinculada'); }
    catch(e) { setMessage(String(e)); }
  };
  const move = (direction: -1 | 1) => {
    if (!document || !selected) return;
    const siblings = Object.values(document.nodes).filter(n => n.parent_id === selected.parent_id).sort((a, b) => a.position - b.position);
    const index = siblings.findIndex(n => n.id === selected.id), neighbor = siblings[index + direction];
    if (neighbor) updateNode(selected.id, { position: Number(neighbor.position) + (direction < 0 ? -0.01 : 0.01) });
  };
  const publish = async (savedByEditor = false) => {
    if (saving && !savedByEditor) { setMessage('Espera a que termine el guardado'); return; }
    try { const validation = await api<any>('admin/publication-validations', { method: 'POST' }); if (!validation.valid) { setMessage('Publicación inválida: ' + JSON.stringify(validation.errors)); return; }
      const result = await api<any>('admin/publications', { method: 'POST', body: JSON.stringify({ activate: true }) }); setMessage(`Publicada versión ${result.publication.version_number}`); await loadResources(); }
    catch (e) { setMessage(String(e)); }
  };
  const restoreHistory = async (target: DocumentPayload, undoing: boolean) => {
    if (!document) return;
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    if (JSON.stringify(target.nodes) === JSON.stringify(document.nodes)) return;
    try {
      const saved = await api<DocumentPayload>(`admin/documents/${document.document.id}/nodes`, { method: 'PUT', body: JSON.stringify({ revision: document.document.revision, nodes: Object.values(target.nodes) }) });
      if (undoing) { setHistory(items => items.slice(0, -1)); setFuture(items => [structuredClone(document), ...items].slice(0, 10)); }
      else { setFuture(items => items.slice(1)); setHistory(items => [...items.slice(-9), structuredClone(document)]); }
      savedDocument.current = saved; workingDocument.current = saved; setDocument(saved); setMessage('Guardado');
      if (selectedId && !saved.nodes[selectedId]) setSelectedId(null);
      setComponentTargetId(null);
    } catch(e) { setMessage(String(e)); }
  };
  const undo = () => { if (!saving && history.length) void restoreHistory(history.at(-1)!, true); };
  const redo = () => { if (!saving && future.length) void restoreHistory(future[0], false); };
  const dropNode = (draggedId: string, targetId: string) => {
    if (!document || draggedId === targetId) return;
    let ancestor: string | null = targetId;
    while (ancestor) { if (ancestor === draggedId) { setMessage('No puedes mover un bloque dentro de su propio subárbol'); return; } ancestor = document.nodes[ancestor]?.parent_id ?? null; }
    const target = document.nodes[targetId];
    const isContainer = ['SECTION','CONTAINER','GRID','FLEX','STACK','COLUMNS'].includes(target.node_type);
    const parentId = isContainer ? targetId : target.parent_id;
    const siblings = Object.values(document.nodes).filter(node => node.parent_id === parentId && node.id !== draggedId).sort((a, b) => Number(a.position) - Number(b.position));
    let position: number;
    if (isContainer) position = (siblings.at(-1)?.position ?? 0) + 10;
    else { const index = siblings.findIndex(node => node.id === targetId), next = siblings[index + 1]; position = next ? (Number(target.position) + Number(next.position)) / 2 : Number(target.position) + 10; }
    updateNode(draggedId, { parent_id: parentId, position });
  };
  const selectNode = (id: string | null) => { setSelectedId(id); setComponentTargetId(null); };
  const selectCanvasNode = (renderedId: string) => {
    if (document?.nodes[renderedId]) { selectNode(renderedId); return; }
    const [instanceId, targetId] = renderedId.split(':');
    setSelectedId(document?.nodes[instanceId] ? instanceId : null); setComponentTargetId(targetId ?? null);
  };
  useEffect(() => { const handler = (event: KeyboardEvent) => { if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') { event.preventDefault(); duplicateSelected(); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') { event.preventDefault(); copySelected(); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') { event.preventDefault(); pasteCopied(); }
    if (event.key === 'Delete') deleteSelected(); if (event.key === 'Escape') selectNode(null);
  }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); });
  useEffect(() => { const close = () => setContextMenu(null); window.addEventListener('click', close); return () => window.removeEventListener('click', close); }, []);

  if (authenticated === null) return <div className="loading">Cargando estudio…</div>;
  if (!authenticated) return <Login onDone={() => setAuthenticated(true)} />;
  return <div className="app-shell puck-shell">
    <CreatePageDialog open={createPageOpen} isFirstPage={pages.length === 0} onOpenChange={setCreatePageOpen} onCreate={createPage}/>
    <aside className="rail"><div className="rail-logo">P</div>{([['pages', Layers3], ['components', Copy], ['styles', WandSparkles], ['projects', FilePlus2], ['assets', UploadCloud], ['links', Link2], ['analytics', Monitor], ['publications', History], ['account', Shield]] as const).map(([name, Icon]) => <button title={name} key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}><Icon size={20}/></button>)}<button title="Salir" className="rail-logout" onClick={async () => { await logout(); setAuthenticated(false); }}><LogOut size={19}/></button></aside>
    <aside className="sidebar">
      <div className="sidebar-title"><span>{tab === 'pages' ? 'Páginas' : tab === 'components' ? 'Biblioteca' : tab === 'styles' ? 'Estilos' : tab === 'projects' ? 'Proyectos' : tab === 'assets' ? 'Assets' : tab === 'links' ? 'Enlaces' : tab === 'publications' ? 'Publicaciones' : tab === 'account' ? 'Cuenta' : 'Analytics'}</span>{tab === 'pages' && <button title="Crear página" onClick={() => setCreatePageOpen(true)}><Plus size={18}/></button>}</div>
      {tab === 'pages' && <><div className="page-list">{pages.map(page => <button key={page.id} className={document?.document.id === page.id ? 'selected' : ''} onClick={() => openPage(page.id)}>{page.name}</button>)}</div>{document?.page && <details className="page-settings"><summary>Ajustes de página</summary><PageSettings key={`${document.document.id}:${document.document.revision}`} document={document} onSaved={async () => { await loadList(); await openPage(document.document.id); }} onDeleted={async () => { setDocument(null); workingDocument.current = null; savedDocument.current = null; await loadList(); }} message={setMessage}/></details>}</>}
      {tab === 'styles' && <StylesPanel classes={classes} tokens={tokens} reload={loadResources} message={setMessage}/>}
      {tab === 'components' && <div className="panel-content">{selected?.node_type === 'COMPONENT_INSTANCE' && <button className="secondary" onClick={detachSelected}>Desvincular componente seleccionado</button>}<button className="secondary" onClick={createComponent}>Guardar selección como componente</button><button className="secondary" onClick={createTemplate}>Guardar selección como template</button><button className="secondary" onClick={async () => { if (!document) return; try { const exported = await api(`admin/documents/${document.document.id}/export`); downloadJSON(`${document.document.name}.json`, exported); } catch(error) { setMessage(String(error)); } }}>Exportar documento</button><label className="upload-button">Importar paquete JSON<input hidden type="file" accept="application/json" onChange={async event => { const file = event.target.files?.[0]; if (!file) return; try { const payload = JSON.parse(await file.text()); await api('admin/imports', { method: 'POST', body: JSON.stringify(payload) }); await Promise.all([loadResources(), loadList()]); setMessage(`${payload.resource_type ?? 'Recurso'} importado`); } catch(error) { setMessage(String(error)); } }}/></label><div className="section-title">Componentes</div>{components.map(component => <div className="resource-row" key={component.document_id}>{component.name}<small>{component.key}</small><div className="row-actions"><button onClick={() => openPage(component.document_id)}>Editar árbol</button><button onClick={() => insertComponent(component.document_id)}>Insertar</button><button onClick={async () => { const exported = await api(`admin/components/${component.document_id}/export`); downloadJSON(`${component.name}.json`, exported); }}>Exportar</button><button onClick={async () => { const name = prompt('Nombre', component.name); const key = prompt('Clave', component.key); if (!name || !key) return; const revision = componentDocs[component.document_id]?.document.revision; try { await api(`admin/components/${component.document_id}`, { method: 'PATCH', headers: { 'If-Match': String(revision) }, body: JSON.stringify({ name, key }) }); await loadResources(); } catch(error) { setMessage(String(error)); } }}>Renombrar</button><button onClick={async () => { if (!confirm(`¿Eliminar «${component.name}»?`)) return; try { await api(`admin/components/${component.document_id}`, { method: 'DELETE' }); await loadResources(); } catch(error) { setMessage(String(error)); } }}>Eliminar</button></div></div>)}<div className="section-title">Templates</div>{templates.map(template => <div className="resource-row" key={template.id}>{template.name}<small>{template.template_type}</small><div className="row-actions"><button onClick={() => insertTemplate(template.id)}>Insertar copia</button><button onClick={async () => { const exported = await api(`admin/templates/${template.id}/export`); downloadJSON(`${template.name}.json`, exported); }}>Exportar</button><button onClick={async () => { const name = prompt('Nombre', template.name); if (!name) return; try { await api(`admin/templates/${template.id}`, { method: 'PATCH', body: JSON.stringify({ name }) }); await loadResources(); } catch(error) { setMessage(String(error)); } }}>Renombrar</button><button onClick={async () => { if (!confirm(`¿Eliminar «${template.name}»?`)) return; try { await api(`admin/templates/${template.id}`, { method: 'DELETE' }); await loadResources(); } catch(error) { setMessage(String(error)); } }}>Eliminar</button></div></div>)}</div>}
      {tab === 'projects' && <ProjectsPanel projects={projects} technologies={technologies} assets={assets} reload={loadResources} message={setMessage}/>}
      {tab === 'assets' && <React.Suspense fallback={<div className="panel-content">Cargando gestor de assets…</div>}><ModernAssetsPanel assets={assets} reload={loadResources} message={setMessage}/></React.Suspense>}
      {tab === 'links' && <LinksPanel links={links} projects={projects} reload={loadResources} message={setMessage}/>}
      {tab === 'analytics' && <AnalyticsPanel pages={pages} projects={projects} publications={publications} message={setMessage}/>}
      {tab === 'publications' && <div className="panel-content"><button className="secondary" onClick={() => void publish()}>Validar y publicar</button>{publications.map(item => <div className="resource-row" key={item.id}>v{item.version_number} · {item.status}<small>{item.content_hash?.slice(0, 12)}</small><div className="row-actions"><button onClick={async () => { try { await api('admin/portfolio-state/active-publication', { method: 'PUT', body: JSON.stringify({ publication_id: item.id }) }); await loadResources(); setMessage(`Activada versión ${item.version_number}`); } catch(e) { setMessage(String(e)); } }}>Activar</button></div></div>)}</div>}
      {tab === 'account' && <AccountPanel message={setMessage} onSignOut={async () => { await logout(); setAuthenticated(false); }}/>} 
    </aside>
    <div className="workspace">{document ? <React.Suspense fallback={<div className="loading-editor">Cargando editor visual…</div>}><PuckEditor key={`${document.document.id}:${puckEpoch}`} document={document} assets={assets} projects={projects} links={links} classes={classes} tokens={tokens} components={components} componentDocs={componentDocs} onLocalChange={next => { workingDocument.current = next; setDocument(next); }} onSaved={saved => { if (workingDocument.current?.document.id !== saved.document.id) return; workingDocument.current = saved; savedDocument.current = saved; setDocument(saved); setSaving(false); }} onReload={(fresh, text) => { workingDocument.current = fresh; savedDocument.current = fresh; setDocument(fresh); setSaving(false); setHistory([]); setFuture([]); setMessage(text); setPuckEpoch(value => value + 1); }} onSavingChange={setSaving} onMessage={setMessage} onPublish={() => publish(true)} onSelectionChange={setSelectedId}/></React.Suspense> : <div className="empty-state"><Layers3 size={44}/><h2>Tu lienzo empieza aquí</h2><p>Crea o selecciona una página para comenzar.</p><button className="primary" onClick={() => setCreatePageOpen(true)}>Crear página</button></div>}</div>
    {contextMenu && <div className="canvas-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={event => event.stopPropagation()}><button onClick={() => { copySelected(); setContextMenu(null); }}>Copiar</button><button onClick={() => { void pasteCopied(); setContextMenu(null); }}>Pegar</button><button onClick={() => { void duplicateSelected(); setContextMenu(null); }}>Duplicar</button><button onClick={() => { void deleteSelected(); setContextMenu(null); }}>Eliminar</button></div>}
    <aside className="inspector"><div className="sidebar-title">Propiedades</div>{selected ? <><div className="inspector-heading"><strong>{selected.node_type}</strong><div><button title="Subir" onClick={() => move(-1)}><ArrowUp size={16}/></button><button title="Bajar" onClick={() => move(1)}><ArrowDown size={16}/></button><button title="Duplicar" onClick={duplicateSelected}><Copy size={16}/></button><button title="Eliminar" onClick={deleteSelected}><Trash2 size={16}/></button></div></div><div className="panel-content">
      {selected.node_type === 'COMPONENT_INSTANCE' && <><button className="secondary" onClick={detachSelected}>Desvincular componente</button><div className="section-title">Nodos del componente</div><div className="component-node-list">{Object.values(selectedComponentDocument?.nodes ?? {}).map(node => <button key={node.id} className={componentTargetId === node.id ? 'active' : ''} onClick={() => setComponentTargetId(node.id)}>{node.node_type}<small>{node.props?.text?.slice(0, 22)}</small></button>)}</div>{componentTarget && <div className="component-override"><div className="section-title">Override · {componentTarget.node_type}</div>{['HEADING','TEXT','BUTTON','LINK','CODE'].includes(componentTarget.node_type) && <label>Texto<textarea key={`${selected.id}:${componentTarget.id}:text:${componentOverride.props_override?.text ?? ''}`} defaultValue={componentOverride.props_override?.text ?? componentTarget.props?.text ?? ''} onBlur={event => { const props = { ...(componentOverride.props_override ?? {}) }; if (event.target.value === (componentTarget.props?.text ?? '')) delete props.text; else props.text = event.target.value; void saveComponentOverride(componentTarget.id, { props_override: props }); }}/></label>}<label>Props override (JSON)<textarea key={`${selected.id}:${componentTarget.id}:props:${JSON.stringify(componentOverride.props_override)}`} defaultValue={JSON.stringify(componentOverride.props_override ?? {}, null, 2)} onBlur={event => { try { const value = JSON.parse(event.target.value); if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('Se espera un objeto JSON'); void saveComponentOverride(componentTarget.id, { props_override: value }); } catch(error) { setMessage(String(error)); } }}/></label><label>Estilos override (JSON)<textarea key={`${selected.id}:${componentTarget.id}:styles:${JSON.stringify(componentOverride.style_override)}`} defaultValue={JSON.stringify(componentOverride.style_override ?? {}, null, 2)} onBlur={event => { try { const value = JSON.parse(event.target.value); if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('Se espera un objeto JSON'); void saveComponentOverride(componentTarget.id, { style_override: value }); } catch(error) { setMessage(String(error)); } }}/></label><div className="section-title">Clases heredadas</div><div className="assigned-classes">{(componentTarget.classes ?? []).map(classId => { const removed = (componentOverride.class_changes ?? []).some(change => change.style_class_id === classId && change.action === 'REMOVE'); return <button className={removed ? 'removed' : ''} key={classId} title={removed ? 'Restaurar clase heredada' : 'Quitar en esta instancia'} onClick={() => { const changes = [...(componentOverride.class_changes ?? [])].filter(change => !(change.style_class_id === classId && change.action === 'REMOVE')); if (!removed) changes.push({ style_class_id: classId, action: 'REMOVE' }); void saveComponentClasses(componentTarget.id, changes); }}>{classes.find(style => style.id === classId)?.slug ?? classId}{removed ? ' ↩' : ' ×'}</button>; })}</div><div className="section-title">Clases añadidas</div><div className="assigned-classes">{(componentOverride.class_changes ?? []).filter(change => change.action === 'ADD').map(change => <button key={change.style_class_id} onClick={() => void saveComponentClasses(componentTarget.id, (componentOverride.class_changes ?? []).filter(item => item !== change))}>{classes.find(style => style.id === change.style_class_id)?.slug ?? change.style_class_id} ×</button>)}</div><select className="class-select" value="" onChange={event => { if (!event.target.value) return; void saveComponentClasses(componentTarget.id, [...(componentOverride.class_changes ?? []), { style_class_id: event.target.value, action: 'ADD' }]); }}><option value="">Añadir clase a la instancia…</option>{classes.filter(style => !(componentTarget.classes ?? []).includes(style.id) && !(componentOverride.class_changes ?? []).some(change => change.style_class_id === style.id && change.action === 'ADD')).map(style => <option key={style.id} value={style.id}>{style.slug}</option>)}</select></div>}</>}
      {['HEADING','TEXT','BUTTON','LINK','CODE'].includes(selected.node_type) && <label>Texto<textarea value={selected.props?.text ?? ''} onChange={e => updateNode(selected.id, { props: { ...selected.props, text: e.target.value } })}/></label>}
      {selected.node_type === 'HEADING' && <label>Nivel<select className="class-select" value={selected.props?.tag ?? 'h2'} onChange={e => updateNode(selected.id, { props: { ...selected.props, tag: e.target.value } })}>{['h1','h2','h3','h4','h5','h6'].map(tag => <option key={tag}>{tag}</option>)}</select></label>}
      {['BUTTON','LINK'].includes(selected.node_type) && <label>Enlace<input value={selected.props?.href ?? ''} onChange={e => updateNode(selected.id, { props: { ...selected.props, href: e.target.value } })}/></label>}
      {['BUTTON','LINK'].includes(selected.node_type) && <label>Enlace trackeado<select className="class-select" value={selected.props?.tracked_link_id ?? ''} onChange={e => updateNode(selected.id, { props: { ...selected.props, tracked_link_id: e.target.value || undefined } })}><option value="">Ninguno</option>{links.map(link => <option key={link.id} value={link.id}>{link.name}</option>)}</select></label>}
      {selected.node_type === 'IMAGE' && <><label>Imagen<select className="class-select" value={selected.props?.asset_id ?? ''} onChange={e => updateNode(selected.id, { props: { ...selected.props, asset_id: e.target.value } })}><option value="">Seleccionar…</option>{assets.filter(asset => asset.mime_type.startsWith('image/')).map(asset => <option key={asset.id} value={asset.id}>{asset.original_filename}</option>)}</select></label><label>Texto alternativo<input value={selected.props?.alt ?? ''} onChange={e => updateNode(selected.id, { props: { ...selected.props, alt: e.target.value } })}/></label></>}
      {selected.node_type === 'VIDEO' && <label>Vídeo<select className="class-select" value={selected.props?.asset_id ?? ''} onChange={e => updateNode(selected.id, { props: { ...selected.props, asset_id: e.target.value } })}><option value="">Seleccionar…</option>{assets.filter(asset => asset.mime_type === 'video/mp4').map(asset => <option key={asset.id} value={asset.id}>{asset.original_filename}</option>)}</select></label>}
      {['PROJECT','PROJECT_CARD'].includes(selected.node_type) && <label>Proyecto<select className="class-select" value={selected.props?.project_id ?? ''} onChange={e => updateNode(selected.id, { props: { ...selected.props, project_id: e.target.value } })}><option value="">Seleccionar…</option>{projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>}
      {selected.node_type === 'PROJECT_LIST' && <label>Proyectos<select className="class-select" multiple value={selected.props?.project_ids ?? []} onChange={e => updateNode(selected.id, { props: { ...selected.props, project_ids: Array.from(e.target.selectedOptions, option => option.value) } })}>{projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>}
      {['GRID','COLUMNS'].includes(selected.node_type) && <label>Columnas<input type="number" min="1" max="12" value={selected.props?.columns ?? (selected.node_type === 'GRID' ? 12 : 2)} onChange={e => updateNode(selected.id, { props: { ...selected.props, columns: Number(e.target.value) } })}/></label>}
      {selected.node_type === 'FLEX' && <><label>Dirección<select className="class-select" value={selected.props?.direction ?? 'row'} onChange={e => updateNode(selected.id, { props: { ...selected.props, direction: e.target.value } })}><option value="row">Fila</option><option value="column">Columna</option></select></label><label className="check-label"><input type="checkbox" checked={(selected.props?.wrap ?? 'wrap') === 'wrap'} onChange={e => updateNode(selected.id, { props: { ...selected.props, wrap: e.target.checked ? 'wrap' : 'nowrap' } })}/> Permitir salto de línea</label></>}
      {selected.node_type === 'SPACER' && <label>Altura<input type="number" min="0" value={selected.props?.height ?? 32} onChange={e => updateNode(selected.id, { props: { ...selected.props, height: Number(e.target.value) } })}/></label>}
      {selected.node_type === 'ICON' && <><label>Símbolo<input value={selected.props?.symbol ?? ''} onChange={e => updateNode(selected.id, { props: { ...selected.props, symbol: e.target.value } })}/></label><label>Etiqueta accesible<input value={selected.props?.label ?? ''} onChange={e => updateNode(selected.id, { props: { ...selected.props, label: e.target.value } })}/></label></>}
      {selected.node_type === 'CODE' && <label>Lenguaje<input value={selected.props?.language ?? ''} onChange={e => updateNode(selected.id, { props: { ...selected.props, language: e.target.value } })}/></label>}
      {selected.node_type === 'STATS' && <PairListEditor items={selected.props?.items ?? []} fields={[['value','Valor'],['label','Etiqueta']]} onChange={items => updateNode(selected.id, { props: { ...selected.props, items } })}/>} {selected.node_type === 'SOCIAL_LINKS' && <PairListEditor items={selected.props?.links ?? []} fields={[['label','Red'],['url','URL']]} onChange={links => updateNode(selected.id, { props: { ...selected.props, links } })}/>} 
      <div className="section-title">Analytics</div><label>Clave estable<input value={selected.analytics_key ?? ''} placeholder="ej. github-hero" onChange={e => updateNode(selected.id, { analytics_key: e.target.value || undefined })}/></label>{['BUTTON','LINK'].includes(selected.node_type) && <label>Tipo de evento<select className="class-select" value={selected.props?.analytics_event_type ?? (selected.node_type === 'BUTTON' ? 'button_click' : 'link_click')} onChange={e => updateNode(selected.id, { props: { ...selected.props, analytics_event_type: e.target.value } })}><option value="button_click">button_click</option><option value="link_click">link_click</option><option value="demo_open">demo_open</option><option value="github_click">github_click</option><option value="contact_click">contact_click</option><option value="cv_download">cv_download</option></select></label>}
      <label>Props avanzadas (JSON)<textarea key={selected.id + ':' + JSON.stringify(selected.props)} defaultValue={JSON.stringify(selected.props ?? {}, null, 2)} onBlur={e => { try { const props = JSON.parse(e.target.value); if (!props || Array.isArray(props) || typeof props !== 'object') throw new Error('Se espera un objeto JSON'); if (JSON.stringify(props) !== JSON.stringify(selected.props)) updateNode(selected.id, { props }); } catch(error) { setMessage(String(error)); } }}/></label>
      <div className="section-title">Layout · {breakpoint}</div><label>Gap<input value={responsiveValue(selected.layout?.gap, breakpoint)} onChange={e => updateNode(selected.id, { layout: { ...selected.layout, gap: responsiveUpdate(selected.layout?.gap, breakpoint, e.target.value) } })}/></label>
      <label>Inicio de columna<input type="number" min="1" max="12" value={responsiveValue(selected.layout?.columnStart, breakpoint)} onChange={e => updateNode(selected.id, { layout: { ...selected.layout, columnStart: responsiveUpdate(selected.layout?.columnStart, breakpoint, Number(e.target.value)) } })}/></label><label>Column span<input type="number" min="1" max="12" value={responsiveValue(selected.layout?.columnSpan, breakpoint)} onChange={e => updateNode(selected.id, { layout: { ...selected.layout, columnSpan: responsiveUpdate(selected.layout?.columnSpan, breakpoint, Number(e.target.value)) } })}/></label><label>Altura mínima<input type="number" min="0" value={responsiveValue(selected.layout?.minHeight, breakpoint)} onChange={e => updateNode(selected.id, { layout: { ...selected.layout, minHeight: responsiveUpdate(selected.layout?.minHeight, breakpoint, Number(e.target.value)) } })}/></label>{['FLEX','STACK'].includes(selected.node_type) && <><label>Alinear elementos<select className="class-select" value={responsiveValue(selected.layout?.alignItems, breakpoint) || 'stretch'} onChange={e => updateNode(selected.id, { layout: { ...selected.layout, alignItems: responsiveUpdate(selected.layout?.alignItems, breakpoint, e.target.value) } })}><option value="stretch">stretch</option><option value="flex-start">inicio</option><option value="center">centro</option><option value="flex-end">final</option></select></label><label>Distribución<select className="class-select" value={responsiveValue(selected.layout?.justifyContent, breakpoint) || 'flex-start'} onChange={e => updateNode(selected.id, { layout: { ...selected.layout, justifyContent: responsiveUpdate(selected.layout?.justifyContent, breakpoint, e.target.value) } })}><option value="flex-start">inicio</option><option value="center">centro</option><option value="flex-end">final</option><option value="space-between">entre</option><option value="space-around">alrededor</option></select></label></>}
      <div className="section-title">Clases</div><div className="assigned-classes">{(selected.classes ?? []).map(id => <button key={id} title="Quitar clase" onClick={() => void assignNodeClasses(selected, (selected.classes ?? []).filter(item => item !== id).map(item => classes.find(style => style.id === item)?.slug ?? item))}>{classes.find(style => style.id === id)?.slug ?? id} ×</button>)}</div><select className="class-select" value="" onChange={e => { if (!e.target.value) return; void assignNodeClasses(selected, [...(selected.classes ?? []).map(id => classes.find(style => style.id === id)?.slug ?? id), e.target.value]); }}><option value="">Añadir clase…</option>{classes.filter(style => !(selected.classes ?? []).includes(style.id)).map(style => <option key={style.id} value={style.slug}>{style.slug}</option>)}</select>
      <div className="section-title">Estilos · {breakpoint}</div><select className="class-select" value={styleState} onChange={e => setStyleState(e.target.value as typeof styleState)}><option value="default">Default</option><option value="hover">Hover</option><option value="focus">Focus</option></select>{['color','backgroundColor','fontSize','padding','margin','borderRadius','maxWidth'].map(key => <label key={key}>{key}<input value={selected.style_overrides?.[breakpoint]?.[styleState]?.[key] ?? ''} onChange={e => updateNode(selected.id, { style_overrides: { ...selected.style_overrides, [breakpoint]: { ...selected.style_overrides?.[breakpoint], [styleState]: { ...selected.style_overrides?.[breakpoint]?.[styleState], [key]: e.target.value } } } })}/></label>)}
    </div></> : document?.page ? <PageSettings key={document.document.id} document={document} onSaved={async () => { await loadList(); await openPage(document.document.id); }} onDeleted={async () => { setDocument(null); workingDocument.current = null; savedDocument.current = null; await loadList(); }} message={setMessage}/> : <div className="inspector-empty">Selecciona un bloque del lienzo o del árbol para editarlo.</div>}</aside>
  </div>;
}

function PairListEditor({ items, fields, onChange }: { items: Record<string, string>[]; fields: [string, string][]; onChange: (items: Record<string, string>[]) => void }) {
  const update = (index: number, key: string, value: string) => onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  return <div className="pair-list"><div className="section-title">Elementos</div>{items.map((item, index) => <div className="pair-row" key={index}>{fields.map(([key, label]) => <label key={key}>{label}<input value={item[key] ?? ''} onChange={event => update(index, key, event.target.value)}/></label>)}<button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}>Eliminar</button></div>)}<button className="secondary" type="button" onClick={() => onChange([...items, Object.fromEntries(fields.map(([key]) => [key, '']))])}><Plus size={14}/> Añadir elemento</button></div>;
}

function PageSettings({ document, onSaved, onDeleted, message }: { document: DocumentPayload; onSaved: () => Promise<void>; onDeleted: () => Promise<void>; message: (value: string) => void }) {
  const page = document.page!;
  const [values, setValues] = useState({ title: page.title, slug: page.slug, seo_title: page.seo_title ?? '', seo_description: page.seo_description ?? '', is_home: page.is_home, is_enabled: page.is_enabled });
  const update = (key: string, value: any) => setValues(current => ({ ...current, [key]: value }));
  return <div className="panel-content"><div className="section-title">Página</div><label>Título<input value={values.title} onChange={e => update('title', e.target.value)}/></label><label>Slug<input value={values.slug} onChange={e => update('slug', e.target.value)}/></label><label>Título SEO<input value={values.seo_title} onChange={e => update('seo_title', e.target.value)}/></label><label>Descripción SEO<textarea value={values.seo_description} onChange={e => update('seo_description', e.target.value)}/></label><label className="check-label"><input type="checkbox" checked={values.is_home} onChange={e => update('is_home', e.target.checked)}/> Página de inicio</label><label className="check-label"><input type="checkbox" checked={values.is_enabled} onChange={e => update('is_enabled', e.target.checked)}/> Visible al publicar</label><button className="secondary" onClick={async () => { try { await api(`admin/pages/${document.document.id}`, { method: 'PATCH', headers: { 'If-Match': String(document.document.revision) }, body: JSON.stringify(values) }); await onSaved(); message('Página guardada'); } catch(e) { message(String(e)); } }}>Guardar página</button><button className="danger-button" onClick={async () => { if (!confirm(`¿Eliminar la página «${page.title}» y todos sus bloques?`)) return; try { await api(`admin/pages/${document.document.id}`, { method: 'DELETE', headers: { 'If-Match': String(document.document.revision) } }); await onDeleted(); } catch(e) { message(String(e)); } }}>Eliminar página</button></div>;
}

function StylesPanel({ classes, tokens, reload, message }: { classes: any[]; tokens: any[]; reload: () => Promise<void>; message: (value: string) => void }) {
  const [activeId, setActiveId] = useState('');
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');
  const [state, setState] = useState<'default' | 'hover' | 'focus'>('default');
  const [properties, setProperties] = useState('{}');
  const active = classes.find(item => item.id === activeId);
  const choose = (id: string, bp = breakpoint, st = state) => { setActiveId(id); const item = classes.find(value => value.id === id); setProperties(JSON.stringify(item?.rules?.[bp]?.[st] ?? {}, null, 2)); };
  return <div className="panel-content"><button className="secondary" onClick={async () => { const name = prompt('Nombre de clase'); if (!name) return; const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); try { const created = await api<any>('admin/styles/classes', { method: 'POST', body: JSON.stringify({ name, slug }) }); await reload(); setActiveId(created.id); } catch(error) { message(String(error)); } }}><Plus size={15}/> Crear clase</button>{classes.map(style => <button className={`resource-row resource-button ${activeId === style.id ? 'active' : ''}`} key={style.id} onClick={() => choose(style.id)}>{style.name}<small>.{style.slug}</small></button>)}{active && <><div className="section-title">Clase · {active.slug}</div><div className="row-actions"><button onClick={async () => { const name = prompt('Nombre', active.name); const slug = prompt('Slug', active.slug); if (!name || !slug) return; try { await api(`admin/styles/classes/${active.id}`, { method: 'PATCH', body: JSON.stringify({ name, slug }) }); await reload(); } catch(error) { message(String(error)); } }}>Renombrar</button><button onClick={async () => { if (!confirm(`¿Eliminar .${active.slug}?`)) return; try { await api(`admin/styles/classes/${active.id}`, { method: 'DELETE' }); setActiveId(''); await reload(); } catch(error) { message(String(error)); } }}>Eliminar</button></div><div className="section-title">Regla</div><div className="rule-controls"><select value={breakpoint} onChange={e => { const value = e.target.value as Breakpoint; setBreakpoint(value); choose(activeId, value, state); }}><option value="desktop">Desktop</option><option value="tablet">Tablet</option><option value="mobile">Mobile</option></select><select value={state} onChange={e => { const value = e.target.value as typeof state; setState(value); choose(activeId, breakpoint, value); }}><option value="default">Default</option><option value="hover">Hover</option><option value="focus">Focus</option></select></div><label>Propiedades JSON<textarea className="rule-json" value={properties} onChange={e => setProperties(e.target.value)}/></label><button className="secondary" onClick={async () => { try { await api(`admin/styles/classes/${activeId}/rules/${breakpoint}/${state}`, { method: 'PUT', body: JSON.stringify(JSON.parse(properties)) }); await reload(); message('Regla guardada'); } catch(error) { message(String(error)); } }}>Guardar regla</button><button className="danger-button" onClick={async () => { try { await api(`admin/styles/classes/${activeId}/rules/${breakpoint}/${state}`, { method: 'DELETE' }); setProperties('{}'); await reload(); } catch(error) { message(String(error)); } }}>Eliminar regla</button></>}<div className="section-title">Tokens</div><button className="secondary" onClick={async () => { const key = prompt('Clave del token'); if (!key) return; const value = prompt('Valor'); if (value === null) return; try { await api('admin/styles/tokens', { method: 'POST', body: JSON.stringify({ key, category: key.split('.')[0], type: 'string', value }) }); await reload(); } catch(error) { message(String(error)); } }}><Plus size={15}/> Crear token</button>{tokens.map(token => <div className="resource-row" key={token.id}>{token.key}<small>{JSON.stringify(token.value)}</small><div className="row-actions"><button onClick={async () => { const raw = prompt('Valor JSON o texto', typeof token.value === 'string' ? token.value : JSON.stringify(token.value)); if (raw === null) return; let value: any = raw; try { value = JSON.parse(raw); } catch { /* keep text */ } try { await api(`admin/styles/tokens/${token.id}`, { method: 'PATCH', body: JSON.stringify({ value }) }); await reload(); } catch(error) { message(String(error)); } }}>Editar</button><button onClick={async () => { if (!confirm(`¿Eliminar ${token.key}?`)) return; try { await api(`admin/styles/tokens/${token.id}`, { method: 'DELETE' }); await reload(); } catch(error) { message(String(error)); } }}>Eliminar</button></div></div>)}</div>;
}

function ProjectsPanel({ projects, technologies, assets, reload, message }: { projects: any[]; technologies: any[]; assets: any[]; reload: () => Promise<void>; message: (value: string) => void }) {
  const [newTitle, setNewTitle] = useState(''); const [newSummary, setNewSummary] = useState('');
  const ordered = [...projects].sort((a, b) => Number(a.position) - Number(b.position));
  const move = async (project: any, direction: -1 | 1) => { const index = ordered.findIndex(item => item.id === project.id), neighbor = ordered[index + direction]; if (!neighbor) return; try { await api(`admin/projects/${project.id}`, { method: 'PATCH', body: JSON.stringify({ position: Number(neighbor.position) + (direction < 0 ? -0.001 : 0.001) }) }); await reload(); } catch(error) { message(String(error)); } };
  const drop = async (sourceId: string, targetId: string) => { const sourceIndex = ordered.findIndex(item => item.id === sourceId), target = ordered.find(item => item.id === targetId); if (sourceIndex < 0 || !target) return; try { await api(`admin/projects/${sourceId}`, { method: 'PATCH', body: JSON.stringify({ position: Number(target.position) + (sourceIndex < ordered.indexOf(target) ? 0.001 : -0.001) }) }); await reload(); message('Orden de proyectos actualizado'); } catch(error) { message(String(error)); } };
  return <div className="panel-content"><div className="section-title">Nuevo proyecto</div><label>Título<input value={newTitle} onChange={e => setNewTitle(e.target.value)}/></label><label>Resumen<textarea value={newSummary} onChange={e => setNewSummary(e.target.value)}/></label><button className="secondary" onClick={async () => { if (!newTitle.trim()) return; try { await api('admin/projects', { method: 'POST', body: JSON.stringify({ title: newTitle.trim(), slug: newTitle.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), summary: newSummary, project_type: 'OTHER', status: 'DRAFT', position: (ordered.at(-1)?.position ?? 0) + 10 }) }); setNewTitle(''); setNewSummary(''); await reload(); } catch(error) { message(String(error)); } }}><Plus size={15}/> Crear proyecto</button><ProjectDndList projects={ordered} onDrop={drop}>{project => <ProjectEditor key={project.id + project.updated_at} project={project} technologies={technologies} assets={assets} onMove={direction => move(project, direction)} reload={reload} message={message}/>}</ProjectDndList><div className="section-title">Tecnologías</div><button className="secondary" onClick={async () => { const name = prompt('Nombre de tecnología'); if (!name) return; try { await api('admin/technologies', { method: 'POST', body: JSON.stringify({ name, slug: name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }) }); await reload(); } catch(error) { message(String(error)); } }}>Nueva tecnología</button>{technologies.map(technology => <div className="resource-row" key={technology.id}>{technology.name}<small>{technology.slug}</small><select className="class-select" value={technology.icon_asset_id ?? ''} onChange={async event => { try { await api(`admin/technologies/${technology.id}`, { method: 'PATCH', body: JSON.stringify({ icon_asset_id: event.target.value || null }) }); await reload(); } catch(error) { message(String(error)); } }}><option value="">Sin icono</option>{assets.filter(asset => asset.mime_type.startsWith('image/')).map(asset => <option key={asset.id} value={asset.id}>{asset.original_filename}</option>)}</select><div className="row-actions"><button onClick={async () => { if (!confirm(`¿Eliminar «${technology.name}»?`)) return; try { await api(`admin/technologies/${technology.id}`, { method: 'DELETE' }); await reload(); } catch(error) { message(String(error)); } }}>Eliminar</button></div></div>)}</div>;
}

function ProjectEditor({ project, technologies, assets, onMove, reload, message }: { project: any; technologies: any[]; assets: any[]; onMove: (direction: -1 | 1) => void; reload: () => Promise<void>; message: (value: string) => void }) {
  const [values, setValues] = useState({ slug: project.slug, title: project.title, summary: project.summary, description: project.description ?? '', project_type: project.project_type, status: project.status, cover_asset_id: project.cover_asset_id ?? '', featured: project.featured, started_at: project.started_at ?? '', completed_at: project.completed_at ?? '' });
  const [technologyIds, setTechnologyIds] = useState<string[]>(project.technology_ids ?? []);
  const update = (key: string, value: any) => setValues(current => ({ ...current, [key]: value }));
  return <details className="resource-row resource-editor"><summary>{project.title}<small>{project.status} · {project.slug}</small></summary><label>Título<input value={values.title} onChange={e => update('title', e.target.value)}/></label><label>Slug<input value={values.slug} onChange={e => update('slug', e.target.value)}/></label><label>Resumen<textarea value={values.summary} onChange={e => update('summary', e.target.value)}/></label><label>Descripción<textarea value={values.description} onChange={e => update('description', e.target.value)}/></label><label>Tipo<select className="class-select" value={values.project_type} onChange={e => update('project_type', e.target.value)}>{['FRONTEND','BACKEND','FULLSTACK','DEVOPS','OTHER'].map(value => <option key={value}>{value}</option>)}</select></label><label>Estado<select className="class-select" value={values.status} onChange={e => update('status', e.target.value)}>{['DRAFT','PUBLISHED','ARCHIVED'].map(value => <option key={value}>{value}</option>)}</select></label><label>Portada<select className="class-select" value={values.cover_asset_id} onChange={e => update('cover_asset_id', e.target.value)}><option value="">Sin portada</option>{assets.filter(asset => asset.mime_type.startsWith('image/')).map(asset => <option key={asset.id} value={asset.id}>{asset.original_filename}</option>)}</select></label><label className="check-label"><input type="checkbox" checked={values.featured} onChange={e => update('featured', e.target.checked)}/> Destacado</label><label>Inicio<input type="date" value={values.started_at} onChange={e => update('started_at', e.target.value)}/></label><label>Finalización<input type="date" value={values.completed_at} onChange={e => update('completed_at', e.target.value)}/></label><div className="section-title">Tecnologías</div>{technologies.map(technology => <label className="check-label" key={technology.id}><input type="checkbox" checked={technologyIds.includes(technology.id)} onChange={e => setTechnologyIds(current => e.target.checked ? [...current, technology.id] : current.filter(id => id !== technology.id))}/>{technology.name}</label>)}<button className="secondary" onClick={async () => { try { await api(`admin/projects/${project.id}`, { method: 'PATCH', body: JSON.stringify({ ...values, description: values.description || null, cover_asset_id: values.cover_asset_id || null, started_at: values.started_at || null, completed_at: values.completed_at || null }) }); await api(`admin/projects/${project.id}/technologies`, { method: 'PUT', body: JSON.stringify({ technology_ids: technologyIds }) }); await reload(); message('Proyecto guardado'); } catch(error) { message(String(error)); } }}>Guardar proyecto</button><div className="row-actions"><button onClick={() => onMove(-1)}>Subir</button><button onClick={() => onMove(1)}>Bajar</button><button onClick={async () => { if (!confirm(`¿Eliminar «${project.title}»?`)) return; try { await api(`admin/projects/${project.id}`, { method: 'DELETE' }); await reload(); } catch(error) { message(String(error)); } }}>Eliminar</button></div></details>;
}

function LinksPanel({ links, projects, reload, message }: { links: any[]; projects: any[]; reload: () => Promise<void>; message: (value: string) => void }) {
  return <div className="panel-content"><button className="secondary" onClick={async () => { const name = prompt('Nombre del enlace'); if (!name) return; const destination_url = prompt('URL de destino'); if (!destination_url) return; const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); try { await api('admin/tracked-links', { method: 'POST', body: JSON.stringify({ name, slug, destination_url, tracking_enabled: true, is_enabled: true }) }); await reload(); } catch(error) { message(String(error)); } }}><Plus size={15}/> Nuevo enlace</button>{links.map(link => <LinkEditor key={link.id + link.updated_at} link={link} projects={projects} reload={reload} message={message}/>)}</div>;
}

function LinkEditor({ link, projects, reload, message }: { link: any; projects: any[]; reload: () => Promise<void>; message: (value: string) => void }) {
  const [values, setValues] = useState({ name: link.name, slug: link.slug, destination_url: link.destination_url, tracking_enabled: link.tracking_enabled, is_enabled: link.is_enabled, project_id: link.project_id ?? '' });
  const update = (key: string, value: any) => setValues(current => ({ ...current, [key]: value }));
  return <details className="resource-row resource-editor"><summary>{link.name}<small>/go/{link.slug}</small></summary><label>Nombre<input value={values.name} onChange={e => update('name', e.target.value)}/></label><label>Slug<input value={values.slug} onChange={e => update('slug', e.target.value)}/></label><label>Destino<input type="url" value={values.destination_url} onChange={e => update('destination_url', e.target.value)}/></label><label>Proyecto<select className="class-select" value={values.project_id} onChange={e => update('project_id', e.target.value)}><option value="">Ninguno</option>{projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label><label className="check-label"><input type="checkbox" checked={values.tracking_enabled} onChange={e => update('tracking_enabled', e.target.checked)}/> Registrar clicks</label><label className="check-label"><input type="checkbox" checked={values.is_enabled} onChange={e => update('is_enabled', e.target.checked)}/> Activo</label><button className="secondary" onClick={async () => { try { await api(`admin/tracked-links/${link.id}`, { method: 'PATCH', body: JSON.stringify({ ...values, project_id: values.project_id || null }) }); await reload(); message('Enlace guardado'); } catch(error) { message(String(error)); } }}>Guardar enlace</button><button className="danger-button" onClick={async () => { if (!confirm(`¿Eliminar «${link.name}»?`)) return; try { await api(`admin/tracked-links/${link.id}`, { method: 'DELETE' }); await reload(); } catch(error) { message(String(error)); } }}>Eliminar enlace</button></details>;
}

function AnalyticsPanel({ pages, projects, publications, message }: { pages: any[]; projects: any[]; publications: any[]; message: (value: string) => void }) {
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [pageId, setPageId] = useState(''); const [projectId, setProjectId] = useState(''); const [publicationId, setPublicationId] = useState('');
  const [data, setData] = useState<any>(null);
  const load = async () => {
    try {
      const query = new URLSearchParams();
      if (from) query.set('from', from + 'T00:00:00'); if (to) query.set('to', to + 'T23:59:59');
      if (pageId) query.set('page_id', pageId); if (projectId) query.set('project_id', projectId); if (publicationId) query.set('publication_id', publicationId);
      const suffix = '?' + query.toString();
      const [overview, timeseries, interactions, projectStats, referrers, funnels] = await Promise.all(['overview','timeseries','interactions','projects','referrers','funnels'].map(path => api<any>(`admin/analytics/${path}${suffix}`)));
      setData({ overview, timeseries, interactions, projects: projectStats, referrers, funnels });
    } catch(e) { message(String(e)); }
  };
  const rows = (values: Record<string, number>) => Object.entries(values).map(([key, count]) => <div className="metric-row" key={key}><span>{key}</span><strong>{String(count)}</strong></div>);
  return <div className="panel-content analytics-panel"><label>Desde<input type="date" value={from} onChange={e => setFrom(e.target.value)}/></label><label>Hasta<input type="date" value={to} onChange={e => setTo(e.target.value)}/></label><label>Página<select className="class-select" value={pageId} onChange={e => setPageId(e.target.value)}><option value="">Todas</option>{pages.map(page => <option key={page.id} value={page.id}>{page.name}</option>)}</select></label><label>Proyecto<select className="class-select" value={projectId} onChange={e => setProjectId(e.target.value)}><option value="">Todos</option>{projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label><label>Publicación<select className="class-select" value={publicationId} onChange={e => setPublicationId(e.target.value)}><option value="">Todas</option>{publications.map(item => <option key={item.id} value={item.id}>v{item.version_number}</option>)}</select></label><button className="secondary" onClick={load}>Actualizar analytics</button>{data && <><React.Suspense fallback={<div className="metric-card">Cargando gráficos…</div>}><AnalyticsCharts data={data}/></React.Suspense><div className="metric-card"><strong>{data.overview.visitors}</strong><span>Visitantes</span></div><div className="metric-row"><span>Page views</span><strong>{data.overview.page_views}</strong></div><div className="metric-row"><span>Project views</span><strong>{data.overview.project_views}</strong></div><div className="metric-row"><span>Clicks externos</span><strong>{data.overview.external_clicks}</strong></div><div className="metric-row"><span>Eventos totales</span><strong>{data.overview.total}</strong></div><div className="section-title">Eventos</div>{rows(data.overview.by_type)}<div className="section-title">Dispositivos</div>{rows(data.overview.by_device)}<div className="section-title">Navegadores</div>{rows(data.overview.by_browser)}<div className="section-title">Funnel</div>{data.funnels.map((item: any) => <div className="metric-row" key={item.event_type}><span>{item.event_type}</span><strong>{item.visitors} · {item.conversion}%</strong></div>)}<div className="section-title">Actividad diaria</div>{data.timeseries.map((item: any) => <div className="metric-row" key={item.date}><span>{item.date}</span><strong>{item.count}</strong></div>)}<div className="section-title">Interacciones</div>{data.interactions.map((item: any) => <div className="metric-row" key={item.target_key}><span>{item.target_key}</span><strong>{item.count}</strong></div>)}<div className="section-title">Proyectos</div>{data.projects.map((item: any) => <div className="metric-row" key={item.project_id}><span>{projects.find(project => project.id === item.project_id)?.title ?? item.project_id}</span><strong>{item.count}</strong></div>)}<div className="section-title">Referencias</div>{data.referrers.map((item: any) => <div className="metric-row" key={item.referrer}><span>{item.referrer}</span><strong>{item.count}</strong></div>)}</>}</div>;
}

function AccountPanel({ message, onSignOut }: { message: (value: string) => void; onSignOut: () => Promise<void> }) {
  const [me, setMe] = useState<any>(null); const [sessions, setSessions] = useState<any[]>([]);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [oldPassword, setOldPassword] = useState(''); const [newPassword, setNewPassword] = useState('');
  const refresh = async () => { try { const [user, activeSessions] = await Promise.all([api('auth/me'), api<any[]>('auth/sessions')]); setMe(user); setSessions(activeSessions); } catch(e) { message(String(e)); } };
  useEffect(() => { void refresh(); }, []);
  return <div className="panel-content"><div className="resource-row">{me?.username ?? 'Usuario'}<small>{me?.email}</small></div><div className="section-title">Contraseña</div><label>Contraseña actual<input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)}/></label><label>Nueva contraseña<input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}/></label><button className="secondary" onClick={async () => { try { await api('auth/password', { method: 'PATCH', body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }) }); await onSignOut(); } catch(e) { message(String(e)); } }}>Cambiar contraseña</button><div className="section-title">Sesiones activas</div>{sessions.map(session => <div className="resource-row" key={session.id}>{session.user_agent || 'Navegador'}<small>{session.ip_address} · {session.created_at}</small><div className="row-actions"><button onClick={async () => { try { await api(`auth/sessions/${session.id}`, { method: 'DELETE' }); await refresh(); } catch(e) { message(String(e)); } }}>Revocar</button></div></div>)}<button className="danger-button" onClick={async () => { try { await api('auth/logout-all', { method: 'POST' }); await onSignOut(); } catch(e) { message(String(e)); } }}>Cerrar todas las sesiones</button><div className="section-title">Auditoría</div><button className="secondary" onClick={async () => { try { setAuditEvents(await api<any[]>('admin/audit-events?limit=30')); } catch(e) { message(String(e)); } }}>Cargar eventos recientes</button>{auditEvents.map(item => <div className="resource-row" key={item.id}>{item.action} · {item.entity_type}<small>{item.created_at}</small></div>)}</div>;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}><App/></QueryClientProvider>
  </React.StrictMode>,
);
