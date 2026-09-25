import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PageRenderer, type Snapshot } from '@portfolio/renderer';
import './style.css';

function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [breakpoint, setBreakpoint] = useState<'desktop' | 'tablet' | 'mobile'>(() => window.innerWidth < 640 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop');
  useEffect(() => { const update = () => setBreakpoint(window.innerWidth < 640 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop'); window.addEventListener('resize', update); return () => window.removeEventListener('resize', update); }, []);
  useEffect(() => {
    fetch('/content/current.json', { cache: 'no-cache' })
      .then(response => { if (!response.ok) throw new Error('No hay una publicación activa'); return response.json(); })
      .then(pointer => fetch(pointer.url))
      .then(response => { if (!response.ok) throw new Error('No se pudo cargar la publicación'); return response.json(); })
      .then(setSnapshot).catch(cause => setError(cause.message));
  }, []);
  const path = location.pathname.replace(/\/$/, '') || '/';
  useEffect(() => {
    if (!snapshot?.pages[path]) return;
    const publication = snapshot.publication ? `v${snapshot.publication.version}` : undefined;
    const send = (event_type: string, target_key?: string, project_id?: string) => {
      const payload = JSON.stringify({ event_id: crypto.randomUUID(), event_type, target_key, project_id, page_id: snapshot.pages[path].id, publication });
      if (navigator.sendBeacon) navigator.sendBeacon('/api/v1/public/analytics/events', new Blob([payload], { type: 'application/json' }));
      else fetch('/api/v1/public/analytics/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
    };
    send('page_view');
    const trackClick = (event: MouseEvent) => {
      const element = (event.target as HTMLElement).closest<HTMLElement>('[data-node-id]');
      if (!element) return;
      const node = snapshot.nodes[element.dataset.nodeId ?? ''];
      if (node?.analyticsKey) {
        const eventType = node.props?.analytics_event_type ?? (node.type === 'BUTTON' ? 'button_click' : node.type === 'LINK' ? 'link_click' : 'click');
        send(eventType, node.analyticsKey, node.props?.project_id);
      }
    };
    window.document.addEventListener('click', trackClick);
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const node = snapshot.nodes[(entry.target as HTMLElement).dataset.nodeId ?? ''];
        if (node?.props?.project_id) send('project_view', node.analyticsKey ?? undefined, node.props.project_id);
        else if (node?.type === 'SECTION' && node.analyticsKey) send('section_view', node.analyticsKey);
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.5 });
    window.document.querySelectorAll<HTMLElement>('[data-node-id]').forEach(element => {
      const node = snapshot.nodes[element.dataset.nodeId ?? ''];
      if (node?.type === 'PROJECT' || node?.type === 'PROJECT_CARD' || node?.type === 'SECTION' && node.analyticsKey) observer.observe(element);
    });
    return () => { window.document.removeEventListener('click', trackClick); observer.disconnect(); };
  }, [snapshot, path]);
  if (error) return <div className="site-message"><h1>Portfolio en preparación</h1><p>{error}</p></div>;
  if (!snapshot) return <div className="site-message">Cargando portfolio…</div>;
  const page = snapshot.pages[path];
  document.title = page?.seoTitle || page?.title || 'Portfolio';
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'description'); document.head.append(meta); }
  meta.setAttribute('content', page?.seoDescription || '');
  return <PageRenderer snapshot={snapshot} path={path} breakpoint={breakpoint} />;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
