// @vitest-environment happy-dom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DocumentPayload } from './editor-types';
import { PuckEditor } from './PuckEditor';

vi.mock('./api', () => ({
  api: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(message: string, public status: number) { super(message); }
  },
}));

describe('PuckEditor', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('mounts the visual editor with the portfolio component catalogue', async () => {
    const documentPayload: DocumentPayload = {
      document: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Inicio', revision: 1 },
      page: { slug: '', title: 'Inicio', is_home: true, is_enabled: true },
      nodes: {},
      root_nodes: [],
    };
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(<PuckEditor document={documentPayload} assets={[]} projects={[]} links={[]} classes={[]} tokens={[]} components={[]} componentDocs={{}} onLocalChange={() => undefined} onSaved={() => undefined} onReload={() => undefined} onSavingChange={() => undefined} onMessage={() => undefined} onPublish={async () => undefined} onSelectionChange={() => undefined}/>);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(document.body.textContent).toContain('Layout');
    expect(document.body.textContent).toContain('Sección');
    expect(document.body.textContent).toContain('Guardar y publicar');
    expect(document.querySelector('iframe')).toBeNull();
    await act(async () => root.unmount());
  });
});
