'use client';

import { useState, useEffect } from 'react';

interface SkillStats {
  total_skills: number;
  graph_density: number;
  nodes: number;
  edges: number;
  excellent: number;
  good: number;
  fair: number;
  poor: number;
}

export default function SkillsPage() {
  const [stats, setStats] = useState<SkillStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/skills', { signal: AbortSignal.timeout(10000) })
      .then(r => r.json())
      .then(res => {
        if (res.success) { setStats(res.data); setError(''); }
        else { setError(res.error || 'Failed'); }
      })
      .catch(() => setError('Service unavailable'));
  }, []);

  if (error && !stats) return (
    <div className="page">
      <div className="page-header"><h1 className="page-title">Skills</h1></div>
      <div style={{ padding: '0.75rem 1rem', background: 'var(--danger-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: '0.8rem' }}>{error}</div>
    </div>
  );

  if (!stats) return <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--muted)' }}>Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Skills</h1>
        <span className="badge badge-gray">{stats.total_skills} total</span>
      </div>

      <div className="kpi-grid">
        {[
          { label: 'Skills', value: stats.total_skills },
          { label: 'Nodes', value: stats.nodes },
          { label: 'Edges', value: stats.edges },
          { label: 'Density', value: `${(stats.graph_density * 100).toFixed(1)}%` },
        ].map(s => (
          <div key={s.label} className="kpi">
            <div><div className="kpi-label">{s.label}</div><div className="kpi-value">{s.value}</div></div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-head"><span className="card-label">Quality Distribution</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
          {[
            { label: 'Excellent >=80', value: stats.excellent, color: 'var(--ok)' },
            { label: 'Good 70-79', value: stats.good, color: 'var(--info)' },
            { label: 'Fair 60-69', value: stats.fair, color: 'var(--warn)' },
            { label: 'Poor <60', value: stats.poor, color: 'var(--danger)' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg-accent)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: s.color, margin: '0 auto 0.5rem' }} />
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-strong)' }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.25rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="card-label">Graph Density</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Target: 8%</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 3, background: stats.graph_density >= 0.08 ? 'var(--ok)' : stats.graph_density >= 0.05 ? 'var(--info)' : 'var(--warn)', width: `${Math.min(stats.graph_density * 500, 100)}%`, transition: 'width 0.5s ease-out' }} />
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.5rem' }}>Current: {(stats.graph_density * 100).toFixed(2)}%</div>
      </div>
    </div>
  );
}
