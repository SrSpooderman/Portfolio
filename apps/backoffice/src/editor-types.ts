export type ComponentOverride = {
  props_override?: Record<string, any>;
  style_override?: Record<string, any>;
  class_changes?: { style_class_id: string; action: 'ADD' | 'REMOVE'; position?: number }[];
};

export type EditorNode = {
  id: string;
  document_id: string;
  parent_id: string | null;
  node_type: string;
  position: number;
  props: Record<string, any>;
  layout: Record<string, any>;
  style_overrides: Record<string, any>;
  analytics_key?: string;
  classes?: string[];
  component_document_id?: string;
  component_overrides?: Record<string, ComponentOverride>;
};

export type DocumentPayload = {
  document: { id: string; name: string; revision: number };
  page?: {
    slug: string;
    title: string;
    is_home: boolean;
    is_enabled: boolean;
    seo_title?: string;
    seo_description?: string;
  };
  component?: { key: string };
  nodes: Record<string, EditorNode>;
  root_nodes: string[];
};

export const nodeTypes = [
  'SECTION', 'CONTAINER', 'GRID', 'FLEX', 'COLUMNS', 'STACK', 'SPACER',
  'HEADING', 'TEXT', 'IMAGE', 'VIDEO', 'BUTTON', 'LINK', 'ICON',
  'PROJECT', 'PROJECT_LIST', 'PROJECT_CARD', 'STATS', 'CODE', 'SOCIAL_LINKS',
] as const;

export const layoutNodeTypes = new Set(['SECTION', 'CONTAINER', 'GRID', 'FLEX', 'COLUMNS', 'STACK']);
