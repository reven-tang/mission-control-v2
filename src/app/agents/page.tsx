'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface AgentInfo {
  id: string;
  name: string;
  status: 'running' | 'idle' | 'offline';
  task?: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents', { signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      if (data.success) {
        setAgents(data.data || []);
        setError('');
      } else {
        setError(data.error || 'Failed to load');
        setAgents([]);
      }
    } catch {
      setError('Gateway unavailable');
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    // Recursive setTimeout — avoids request pile-up
    const scheduleNext = () => {
      timerRef.current = setTimeout(async () => {
        await fetchAgents();
        scheduleNext();
      }, 10000); // 10s interval, not 5s
    };
    scheduleNext();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [fetchAgents]);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Agents</h1>
        <span className="badge badge-gray">{agents.length} agents</span>
      </div>

      {error && <div style={{ padding: '0.75rem', background: 'var(--danger-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>Loading...</div>
      ) : agents.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {agents.map(a => (
            <div key={a.id} className="card" style={{ padding: '1.1rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.55rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: a.status === 'running' ? 'var(--ok)' : a.status === 'idle' ? 'var(--warn)' : 'var(--muted-strong)' }} />
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-strong)' }}>{a.name}</span>
                </div>
                <span className={`badge ${a.status === 'running' ? 'badge-green' : a.status === 'idle' ? 'badge-amber' : 'badge-gray'}`}>{a.status}</span>
              </div>
              {a.task && (
                <div style={{ marginTop: '0.55rem', padding: '0.5rem 0.7rem', background: 'var(--accent-subtle)', borderRadius: 4, fontSize: '0.78rem', color: 'var(--accent)' }}>{a.task}</div>
              )}
              <div style={{ marginTop: '0.7rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border)', fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{a.id}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
          No agents detected. Gateway may not be running.
        </div>
      )}
    </div>
  );
}
