import { queryOptions } from '@tanstack/react-query';
import { api } from './api';
import type { DocumentPayload } from './editor-types';

export const queryKeys = {
  documents: ['documents'] as const,
  resources: ['portfolio-resources'] as const,
};

export const documentsQuery = (enabled = true) => queryOptions({
  queryKey: queryKeys.documents,
  enabled,
  queryFn: async () => {
    const documents = await api<any[]>('admin/documents');
    return documents.filter(document => document.document_type === 'PAGE');
  },
});

export const resourcesQuery = (enabled = true) => queryOptions({
  queryKey: queryKeys.resources,
  enabled,
  queryFn: async () => {
    const [styles, tokens, projects, assets, components, templates, links, publications, technologies] = await Promise.all([
      api<any[]>('admin/styles/classes'),
      api<any[]>('admin/styles/tokens'),
      api<any[]>('admin/projects'),
      api<any[]>('admin/assets'),
      api<any[]>('admin/components'),
      api<any[]>('admin/templates'),
      api<any[]>('admin/tracked-links'),
      api<any[]>('admin/publications'),
      api<any[]>('admin/technologies'),
    ]);
    const [rules, componentDocuments] = await Promise.all([
      Promise.all(styles.map(style => api<any[]>(`admin/styles/classes/${style.id}/rules`))),
      Promise.all(components.map(component => api<DocumentPayload>(`admin/documents/${component.document_id}`))),
    ]);
    const classes = styles.map((style, index) => ({
      ...style,
      rules: rules[index].reduce((result: Record<string, Record<string, unknown>>, rule: any) => {
        (result[rule.breakpoint] ??= {})[rule.state] = rule.properties;
        return result;
      }, {}),
    }));
    return {
      classes,
      tokens,
      projects,
      assets,
      components,
      templates,
      links,
      publications,
      technologies,
      componentDocs: Object.fromEntries(componentDocuments.map(document => [document.document.id, document])) as Record<string, DocumentPayload>,
    };
  },
});
