'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Task, TaskStatus } from '@/lib/types';

const PRIORITY_LABEL: Record<number, string> = { 0: 'None', 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical' };
const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'backlog', label: 'BACKLOG', color: 'var(--muted-strong)' },
  { value: 'todo', label: 'TODO', color: 'var(--info)' },
  { value: 'in_progress', label: 'IN PROGRESS', color: 'var(--warn)' },
  { value: 'review', label: 'REVIEW', color: 'var(--accent)' },
  { value: 'done', label: 'DONE', color: 'var(--ok)' },
];

type ExecStatus = 'idle' | 'executing' | 'done' | 'error';

export function TaskDetailPanel({ allTasks }: { allTasks: Task[] }) {
  const searchParams = useSearchParams();
  const taskId = searchParams.get('task');
  const [task, setTask] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [execStatus, setExecStatus] = useState<ExecStatus>('idle');
  const [execResult, setExecResult] = useState('');
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (taskId) {
      const found = allTasks.find(t => t.id === taskId);
      setTask(found || null);
    } else {
      setTask(null);
    }
    setExecStatus('idle');
    setExecResult('');
  }, [taskId, allTasks]);

  const handleDelete = async () => {
    if (!task || deleting) return;
    if (!confirm('Delete this task?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/stories/${task.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert('❌ Delete failed: ' + (data.error || res.statusText || 'unknown'));
        setDeleting(false);
        return;
      }
      setTask(null);
    } catch (e: any) {
      alert('❌ Delete failed: ' + e.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleExecute = async () => {
    if (!task || execStatus === 'executing') return;
    setExecStatus('executing');
    setExecResult('');
    try {
      const res = await fetch(`/api/tasks/${task.id}/execute`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setExecStatus('done');
        setExecResult(data.result || 'Task executed successfully.');
        if (data.task) setTask(data.task);
      } else {
        setExecStatus('error');
        setExecResult(data.error || 'Execution failed.');
      }
    } catch (e: any) {
      setExecStatus('error');
      setExecResult(e.message || 'Network error.');
    }
  };

  const handleMove = async (newStatus: TaskStatus) => {
    if (!task || moving) return;
    setMoving(true);
    try {
      const res = await fetch(`/api/stories/${task.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setTask(data.data);
        setExecStatus('done');
        setExecResult(`Moved to ${newStatus}`);
      }
    } catch (e: any) {
      setExecStatus('error');
      setExecResult(e.message || 'Move failed.');
    }
    setMoving(false);
  };

  if (!task) return null;
  const canExecute = ['backlog', 'todo', 'in_progress'].includes(task.status);

  return (
    <div style={{
      position: 'fixed', right: 0, top: 0, bottom: 0,
      width: 400, background: 'var(--bg-elevated)',
      borderLeft: '1px solid var(--border)',
      padding: '1.5rem', overflowY: 'auto', zIndex: 50,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span className="card-label">Task Detail</span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={handleExecute}
            disabled={!canExecute || execStatus === 'executing'}
            style={{
              padding: '0.2rem 0.6rem', fontSize: '0.68rem', fontWeight: 600,
              background: canExecute && execStatus !== 'executing' ? 'var(--ok)' : 'var(--muted-strong)',
              color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)',
              cursor: canExecute && execStatus !== 'executing' ? 'pointer' : 'not-allowed',
              opacity: canExecute && execStatus !== 'executing' ? 1 : 0.5,
            }}
          >
            {execStatus === 'executing' ? 'Executing' : execStatus === 'done' ? 'Done' : execStatus === 'error' ? 'Failed' : 'Execute'}
          </button>
          <button onClick={handleDelete} disabled={deleting} style={{
            padding: '0.2rem 0.6rem', fontSize: '0.68rem', fontWeight: 600,
            background: '#7f1d1d', color: '#fca5a5', border: 'none',
            borderRadius: 'var(--radius-sm)', cursor: deleting ? 'not-allowed' : 'pointer',
            opacity: deleting ? 0.5 : 1,
          }}>{deleting ? 'Deleting' : 'Delete'}</button>
          <a href="/kanban" style={{ fontSize: '0.75rem', color: 'var(--muted)', textDecoration: 'none' }}>✕</a>
        </div>
      </div>

      <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-strong)', marginBottom: '0.75rem' }}>{task.title}</div>

      {/* Status Selector */}
      <div className="stat-row" style={{ marginBottom: '0.75rem' }}>
        <span className="stat-label">Status</span>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleMove(opt.value)}
              disabled={moving || task.status === opt.value}
              style={{
                padding: '0.2rem 0.5rem', fontSize: '0.65rem', fontWeight: 600,
                background: task.status === opt.value ? opt.color : 'var(--bg-elevated)',
                color: task.status === opt.value ? '#fff' : 'var(--text)',
                border: 'none', borderRadius: 'var(--radius-sm)',
                cursor: task.status === opt.value ? 'default' : 'pointer',
                opacity: task.status === opt.value ? 1 : 0.7,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="stat-row">
        <span className="stat-label">Priority</span>
        <span className="stat-value">{PRIORITY_LABEL[task.priority ?? 0]}</span>
      </div>
      <div className="stat-row">
        <span className="stat-label">Source</span>
        <span className="stat-value">{task.source}</span>
      </div>
      <div className="stat-row">
        <span className="stat-label">Created</span>
        <span className="stat-value" style={{ fontSize: '0.75rem' }}>{new Date(task.created_at).toLocaleString('zh-CN')}</span>
      </div>
      <div className="stat-row">
        <span className="stat-label">Updated</span>
        <span className="stat-value" style={{ fontSize: '0.75rem' }}>{new Date(task.updated_at).toLocaleString('zh-CN')}</span>
      </div>

      {task.description && (
        <div style={{ marginTop: '1.25rem' }}>
          <span className="card-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Description</span>
          <div style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.6 }}>{task.description}</div>
        </div>
      )}

      {task.tags && task.tags.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <span className="card-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Tags</span>
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {task.tags.map(t => <span key={t} className="badge badge-gray">#{t}</span>)}
          </div>
        </div>
      )}

      {task.artifacts && task.artifacts.length > 0 && (
        <div style={{ marginTop: '1.25rem' }}>
          <span className="card-label" style={{ display: 'block', marginBottom: '0.5rem' }}>📦 产出物</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {task.artifacts.map((a, i) => (
              <div key={i} style={{
                padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-subtle)', border: '1px solid var(--accent)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1rem' }}>{a.type === 'url' ? '🔗' : a.type === 'file' ? '📄' : '⚡'}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-strong)' }}>{a.name}</span>
                  <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>{a.type}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--accent)', marginTop: '0.3rem', fontFamily: 'var(--font-mono)' }}>
                  {a.type === 'url' && a.url && <div>🔗 <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{a.url}</a></div>}
                  {a.type === 'file' && a.path && <div>📄 {a.path}</div>}
                  {a.type === 'api' && a.url && <div>⚡ <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{a.url}</a></div>}
                </div>
                {a.description && <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.2rem' }}>{a.description}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {task.assigned_agent && (
        <div style={{ marginTop: '1rem' }}>
          <span className="card-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Assigned Agent</span>
          <span className="stat-value">{task.assigned_agent}</span>
        </div>
      )}

      {execResult && (
        <div style={{ marginTop: '1.25rem' }}>
          <span className="card-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Result</span>
          <div style={{
            padding: '0.75rem', borderRadius: 'var(--radius-sm)',
            background: execStatus === 'done' ? 'var(--ok-subtle)' : 'var(--danger-subtle)',
            border: `1px solid ${execStatus === 'done' ? 'var(--ok)' : 'var(--danger)'}`,
            fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap',
          }}>{execResult}</div>
        </div>
      )}

      <div style={{ marginTop: '1.5rem', fontSize: '0.68rem', color: 'var(--muted-strong)', fontFamily: 'var(--font-mono)' }}>
        ID: {task.id}
      </div>
    </div>
  );
}
