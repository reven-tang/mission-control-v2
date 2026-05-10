'use client';

import Link from 'next/link';
import { useState, useCallback } from 'react';
import type { TaskStatus, Task, Artifact } from '@/lib/types';

const PRIORITY_DOT: Record<number, string> = {
  0: 'var(--muted-strong)', 1: 'var(--info)', 2: 'var(--warn)', 3: 'var(--danger)', 4: 'var(--danger)',
};

function ArtifactLink({ artifact }: { artifact: Artifact }) {
  const icon = artifact.type === 'url' ? '🔗' : artifact.type === 'file' ? '📄' : '⚡';
  const href = artifact.type === 'url' ? artifact.url : artifact.type === 'file' ? `/kanban?artifact=${encodeURIComponent(artifact.path || '')}` : `/kanban?artifact=${encodeURIComponent(artifact.url || '')}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{
      fontSize: '0.7rem', color: 'var(--accent)', textDecoration: 'none',
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      padding: '0.15rem 0.4rem', borderRadius: 'var(--radius-sm)',
      background: 'var(--accent-subtle)',
    }}>
      {icon} {artifact.name}
    </a>
  );
}

interface KanbanColumnProps {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  onDragStart: (taskId: string) => void;
  onDrop: (status: TaskStatus) => void;
  dragging: string | null;
}

function KanbanColumn({ status, label, tasks, onDragStart, onDrop, dragging }: KanbanColumnProps) {
  const [isOver, setIsOver] = useState(false);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  }, []);
  
  const handleDragLeave = useCallback(() => {
    setIsOver(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    onDrop(status);
  }, [status, onDrop]);

  return (
    <div className="kb-col" style={{ flex: '1 1 20%', minWidth: 180, maxWidth: 280 }}>
      <div className="kb-head">
        <span>{label}</span>
        <span className="kb-count">{tasks.length}</span>
      </div>
      <div className="kb-list" style={{ minHeight: 400, background: isOver ? 'var(--accent-subtle)' : 'transparent', transition: 'background 0.2s', borderRadius: 'var(--radius)', overflowY: 'auto' }} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        {tasks.map(task => (
          <div key={task.id} draggable onDragStart={() => onDragStart(task.id)} style={{ marginBottom: '0.5rem', opacity: dragging === task.id ? 0.5 : 1, cursor: 'grab' }}>
            <Link href={`/kanban?task=${task.id}`} className="kb-card" style={{ borderLeftColor: PRIORITY_DOT[task.priority ?? 0], textDecoration: 'none', display: 'block' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-strong)', lineHeight: 1.4 }}>{task.title}</span>
                <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 5, background: PRIORITY_DOT[task.priority ?? 0] }} />
              </div>
              {task.description && (
                <p style={{ 
                  fontSize: '0.75rem', 
                  color: 'var(--muted)', 
                  marginTop: '0.4rem', 
                  lineHeight: 1.5, 
                  display: '-webkit-box', 
                  WebkitLineClamp: 2, 
                  WebkitBoxOrient: 'vertical', 
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                }}>
                  {task.description}
                </p>
              )}
              <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.65rem', flexWrap: 'wrap' }}>
                <span className="badge badge-gray">{task.source}</span>
                {task.tags?.slice(0, 2).map(t => (<span key={t} className="badge badge-gray">#{t}</span>))}
              </div>
              {/* 产出物链接 - DONE 和 REVIEW 阶段显示 */}
              {task.artifacts && task.artifacts.length > 0 && (
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>产出:</span>
                  {task.artifacts.map((a, i) => <ArtifactLink key={i} artifact={a} />)}
                </div>
              )}
            </Link>
          </div>
        ))}
        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', fontSize: '0.8rem', color: 'var(--muted-strong)', border: '2px dashed var(--border)', borderRadius: 'var(--radius)', margin: '0.5rem 0' }}>Drop here</div>
        )}
      </div>
    </div>
  );
}

interface KanbanClientProps {
  columns: { status: TaskStatus; label: string }[];
  kanban: Record<TaskStatus, Task[]>;
  allTasks: Task[];
}

export function KanbanClient({ columns, kanban, allTasks }: KanbanClientProps) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [localKanban, setLocalKanban] = useState(kanban);

  const handleDragStart = useCallback((taskId: string) => {
    setDragging(taskId);
  }, []);

  const handleDrop = useCallback(async (newStatus: TaskStatus) => {
    if (!dragging) return;
    const task = allTasks.find(t => t.id === dragging);
    if (!task || task.status === newStatus) {
      setDragging(null);
      return;
    }
    setLocalKanban(prev => {
      const next = { ...prev };
      next[task.status] = next[task.status].filter(t => t.id !== dragging);
      next[newStatus] = [...next[newStatus], { ...task, status: newStatus }];
      return next;
    });
    try {
      await fetch(`/api/stories/${dragging}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (e) {
      console.error('Move failed:', e);
      setLocalKanban(kanban);
    }
    setDragging(null);
  }, [dragging, allTasks, kanban]);

  return (
    <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem', width: '100%' }}>
      {columns.map(col => (
        <KanbanColumn key={col.status} status={col.status} label={col.label} tasks={localKanban[col.status] || []} onDragStart={handleDragStart} onDrop={handleDrop} dragging={dragging} />
      ))}
    </div>
  );
}