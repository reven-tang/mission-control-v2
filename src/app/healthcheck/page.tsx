'use client';

import { useState, useEffect } from 'react';

export default function HealthcheckPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/healthcheck', { signal: AbortSignal.timeout(15000) });
      const data = await res.json();
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Healthcheck failed');
      }
    } catch (e: any) {
      setError(e.name === 'TimeoutError' ? 'Request timed out (15s)' : 'Service unavailable');
    }
    setLoading(false);
  };

  // Auto-run on mount
  useEffect(() => { run(); }, []);

  const scoreColor = result?.data?.overall_score >= 80 ? 'var(--ok)' :
    result?.data?.overall_score >= 60 ? 'var(--warn)' : 'var(--danger)';

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Healthcheck</h1>
        <button
          onClick={run}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            background: loading ? 'var(--bg-elevated)' : 'var(--accent)',
            color: 'var(--accent-foreground)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Checking...' : '↻ Refresh'}
        </button>
      </div>

      {error && <div style={{ padding: '0.75rem 1rem', background: 'var(--danger-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '1rem' }}>{error}</div>}

      {result?.data && (
        <>
          <div className="card" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ fontSize: '3rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: scoreColor }}>
              {result.data.overall_score}
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Overall Score</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text)', marginTop: '0.25rem' }}>
                <span style={{ color: 'var(--danger)' }}>{result.data.issues_found}</span> issues,
                <span style={{ color: 'var(--ok)' }}> {result.data.auto_fixed}</span> fixed
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Object.entries(result.data)
              .filter(([k]) => !['overall_score','issues_found','auto_fixed'].includes(k))
              .map(([key, val]: any) => (
                <div key={key} className="card" style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: val.passed ? 'var(--ok)' : 'var(--danger)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-strong)', textTransform: 'capitalize' }}>{key}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.15rem', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>{val.detail?.slice(0, 150) || 'ok'}</div>
                  </div>
                  <span className={`badge ${val.passed ? 'badge-green' : 'badge-red'}`}>{val.passed ? 'pass' : 'fail'}</span>
                </div>
              ))}
          </div>
        </>
      )}

      {loading && !result && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
          Running healthcheck...
        </div>
      )}
    </div>
  );
}
