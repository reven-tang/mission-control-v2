'use client';

import { useState, useEffect } from 'react';

interface MemoryResult {
  id: string;
  title: string;
  content: string;
  tags: string[];
  source?: string;
}

export default function BrainPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemoryResult[]>([]);
  const [recent, setRecent] = useState<MemoryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentLoading, setRecentLoading] = useState(true);
  const [selected, setSelected] = useState<MemoryResult | null>(null);

  useEffect(() => {
    fetch('/api/memory/recent', { signal: AbortSignal.timeout(8000) })
      .then(r => r.json())
      .then(res => { if (res.success) setRecent(res.data || []); })
      .catch(() => {})
      .finally(() => setRecentLoading(false));
  }, []);

  const search = async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/memory/search?q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      setResults(data.success ? (data.data || []) : []);
    } catch { setResults([]); }
    setLoading(false);
  };

  const showList = results.length > 0 ? results : recent;
  const sectionLabel = results.length > 0 ? `Search Results (${results.length})` : 'Recent';

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Main list */}
      <div className="page" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="page-header">
          <h1 className="page-title">Brain</h1>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search(query)}
              placeholder="Search memory, notes, decisions..."
              style={{ flex: 1 }}
            />
            <button
              onClick={() => search(query)}
              disabled={loading}
              style={{
                padding: '0.65rem 1.25rem',
                background: loading ? 'var(--border)' : 'var(--accent)',
                color: 'var(--accent-foreground)', border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        <div className="card-label" style={{ marginBottom: '0.75rem' }}>{sectionLabel}</div>

        {recentLoading && results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>Loading...</div>
        ) : showList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>No memories found</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {showList.map(r => (
              <button
                key={r.id}
                className="mem-item"
                onClick={() => setSelected(selected?.id === r.id ? null : r)}
                style={{
                  cursor: 'pointer', width: '100%', textAlign: 'left',
                  borderLeft: selected?.id === r.id ? '3px solid var(--accent)' : undefined,
                }}
              >
                <div className="mem-title">{r.title}</div>
                <div className="mem-snippet">{r.content}</div>
                {r.tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    {r.tags.slice(0, 4).map(t => <span key={t} className="badge badge-blue">#{t}</span>)}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{
          width: 380, background: 'var(--card)',
          borderLeft: '1px solid var(--border)',
          padding: '1.5rem', overflowY: 'auto',
          position: 'sticky', top: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span className="card-label">Detail</span>
            <button onClick={() => setSelected(null)} className="theme-btn">✕</button>
          </div>

          <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-strong)', marginBottom: '0.75rem', lineHeight: 1.4 }}>{selected.title}</div>

          <div className="stat-row">
            <span className="stat-label">Source</span>
            <span className="stat-value" style={{ fontSize: '0.75rem' }}>{selected.source || 'memory'}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">ID</span>
            <span className="stat-value" style={{ fontSize: '0.68rem' }}>{selected.id}</span>
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <span className="card-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Content</span>
            <div style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selected.content}</div>
          </div>

          {selected.tags?.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <span className="card-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Tags</span>
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                {selected.tags.map(t => <span key={t} className="badge badge-blue">#{t}</span>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
