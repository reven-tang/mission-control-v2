'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export default function SystemPage() {
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/system', { signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
        setError('');
      } else {
        setError(data.error || 'Failed');
      }
    } catch {
      setError('Service unavailable');
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const scheduleNext = () => {
      timerRef.current = setTimeout(async () => {
        await fetchStats();
        scheduleNext();
      }, 10000);
    };
    scheduleNext();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [fetchStats]);

  if (!stats && !error) return <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--muted)' }}>Loading...</div>;

  const bars = [
    { label: 'CPU', value: stats?.cpu_usage ?? 0, warn: 80 },
    { label: 'Memory', value: stats?.memory_usage ?? 0, warn: 90 },
    { label: 'Disk', value: stats?.disk_usage ?? 0, warn: 85 },
  ];

  const uptimeStr = (() => {
    if (!stats?.uptime) return '--';
    const h = Math.floor(stats.uptime / 3600);
    const m = Math.floor((stats.uptime % 3600) / 60);
    return `${h}h ${m}m`;
  })();

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">System</h1>
        <span className="badge badge-gray">{uptimeStr}</span>
      </div>

      {error && <div style={{ padding: '0.75rem', background: 'var(--danger-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '1rem' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {bars.map(bar => (
          <div key={bar.label} className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{bar.label}</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: bar.value > bar.warn ? 'var(--danger)' : 'var(--text-strong)' }}>{bar.value}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 2, background: bar.value > bar.warn ? 'var(--danger)' : bar.value > bar.warn * 0.6 ? 'var(--warn)' : 'var(--ok)', width: `${bar.value}%`, transition: 'width 0.5s ease-out' }} />
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="card-head"><span className="card-label">Environment</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            { label: 'Node', value: process.version },
            { label: 'Platform', value: `${process.platform} ${process.arch}` },
            { label: 'Uptime', value: uptimeStr },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{row.label}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-strong)', fontFamily: 'var(--font-mono)' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
