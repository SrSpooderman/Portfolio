import React from 'react';
import { DragDropProvider, useDraggable, useDroppable } from '@dnd-kit/react';

function DraggableProject({ id, children }: { id: string; children: React.ReactNode }) {
  const drag = useDraggable({ id });
  const drop = useDroppable({ id });
  return <div
    ref={element => { drag.ref(element); drop.ref(element); }}
    className={`dnd-project ${drag.isDragging ? 'is-dragging' : ''} ${drop.isDropTarget ? 'is-drop-target' : ''}`}
  >
    <button className="drag-handle" ref={drag.handleRef} type="button" aria-label="Reordenar proyecto" title="Arrastra para reordenar">⠿</button>
    {children}
  </div>;
}

export function ProjectDndList({ projects, onDrop, children }: {
  projects: any[];
  onDrop: (sourceId: string, targetId: string) => void | Promise<void>;
  children: (project: any) => React.ReactNode;
}) {
  return <DragDropProvider onDragEnd={event => {
    const sourceId = event.operation.source?.id;
    const targetId = event.operation.target?.id;
    if (!event.canceled && sourceId != null && targetId != null && sourceId !== targetId) void onDrop(String(sourceId), String(targetId));
  }}>
    <div className="dnd-project-list">{projects.map(project => <DraggableProject key={project.id} id={project.id}>{children(project)}</DraggableProject>)}</div>
  </DragDropProvider>;
}
