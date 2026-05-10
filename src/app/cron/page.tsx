'use client';

import { useState, useEffect } from 'react';

interface CronJob {
  id: string;
  name: string;
  schedule: { expr?: string; kind?: string; tz?: string };
  enabled: boolean;
  lastRunAtMs?: number;
  nextRunAtMs?: number;
  status?: string;
  payload?: { kind?: string; message?: string };
  delivery?: { mode?: string; channel?: string; to?: string };
}

export default function CronPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState('');
  const [selectedJob, setSelectedJob] = useState<CronJob | null>(null);

  useEffect(() => {
    fetch('/api/cron', { signal: AbortSignal.timeout(8000) })
      .then(r => r.json())
      .then(res => { if (res.success) setJobs(res.data || []); })
      .catch(() => {});
  }, []);

  const [deleting, setDeleting] = useState<string | null>(null);

  const deleteJob = async (jobId: string, jobName: string) => {
    if (!confirm(`Delete cron job "${jobName}"? This cannot be undone.`)) return;
    setDeleting(jobId);
    try {
      const res = await fetch(`/api/cron?id=${jobId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setJobs(jobs.filter(j => j.id !== jobId));
        setResult(`✅ Deleted: ${jobName}`);
      } else {
        setResult(`❌ Delete failed: ${data.error}`);
      }
    } catch (e: any) {
      setResult(`❌ Delete error: ${e.message}`);
    }
    setDeleting(null);
  };

  const triggerJob = async (jobId: string) => {
    setRunning(jobId);
    setResult('');
    try {
      const res = await fetch(`/api/cron?id=${jobId}`, {
        method: 'POST',
        signal: AbortSignal.timeout(60000),
      });
      const data = await res.json();
      setResult(`[${jobId}] ${data.success ? '✅' : '❌'} ${data.content ? data.content.slice(0, 500) : data.message || data.error}`);
    } catch (e: any) {
      setResult(`[${jobId}] ❌ ${e.name === 'TimeoutError' ? 'Timed out' : 'Failed'}`);
    }
    setRunning(null);
  };

  const formatTime = (ms?: number) => {
    if (!ms) return 'Never';
    return new Date(ms).toLocaleString('zh-CN', { hour12: false });
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Cron</h1>
        <span className="badge badge-gray">{jobs.length} jobs</span>
      </div>

      {result && (
        <div className="card" style={{ marginBottom: '1rem', fontSize: '0.78rem', color: 'var(--text)', whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>{result}</div>
      )}

      {/* Job List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {jobs.map(job => (
          <div key={job.id} className="card" style={{ padding: '0.85rem 1.1rem', cursor: 'pointer' }} onClick={() => setSelectedJob(job)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-strong)' }}>{job.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {typeof job.schedule === 'string' ? job.schedule : job.schedule?.expr || 'unknown'}
                </div>
              </div>
              <span className={`badge ${job.status === 'ok' ? 'badge-green' : 'badge-gray'}`}>{job.status || 'idle'}</span>
              <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textAlign: 'right' }}>
                <div>Last: {formatTime(job.lastRunAtMs)}</div>
                <div>Next: {formatTime(job.nextRunAtMs)}</div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); triggerJob(job.id); }} 
                disabled={running === job.id}
                style={{
                  padding: '0.3rem 0.8rem',
                  background: running === job.id ? 'var(--border)' : 'var(--accent)',
                  color: 'var(--accent-foreground)', border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.72rem', fontWeight: 600,
                  cursor: running === job.id ? 'not-allowed' : 'pointer',
                  opacity: running === job.id ? 0.5 : 1,
                }}
              >
                {running === job.id ? 'Running…' : 'Run'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedJob && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }} onClick={() => setSelectedJob(null)}>
          <div className="card" style={{
            maxWidth: 600, width: '90%', maxHeight: '80vh', overflow: 'auto',
            padding: '1.5rem',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{selectedJob.name}</h2>
              <button onClick={() => setSelectedJob(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem' }}>
              <div><strong>ID:</strong> <code style={{ fontSize: '0.75rem' }}>{selectedJob.id}</code></div>
              <div><strong>Schedule:</strong> <code>{typeof selectedJob.schedule === 'string' ? selectedJob.schedule : selectedJob.schedule?.expr}</code></div>
              <div><strong>Timezone:</strong> {selectedJob.schedule?.tz || 'Asia/Shanghai'}</div>
              <div><strong>Enabled:</strong> {selectedJob.enabled ? '✅ Yes' : '❌ No'}</div>
              <div><strong>Last Run:</strong> {formatTime(selectedJob.lastRunAtMs)}</div>
              <div><strong>Next Run:</strong> {formatTime(selectedJob.nextRunAtMs)}</div>
              <div><strong>Status:</strong> <span className={`badge ${selectedJob.status === 'ok' ? 'badge-green' : 'badge-gray'}`}>{selectedJob.status || 'idle'}</span></div>
              
              {selectedJob.payload?.message && (
                <div>
                  <strong>Payload:</strong>
                  <pre style={{ 
                    background: 'var(--bg-elevated)', padding: '0.75rem', 
                    borderRadius: 'var(--radius-sm)', fontSize: '0.75rem',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                  }}>{selectedJob.payload.message}</pre>
                </div>
              )}
              
              {selectedJob.delivery && (
                <div>
                  <strong>Delivery:</strong>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                    Mode: {selectedJob.delivery.mode || 'none'}<br/>
                    Channel: {selectedJob.delivery.channel || 'N/A'}<br/>
                    {selectedJob.delivery.to && <>To: <code>{selectedJob.delivery.to}</code></>}
                  </div>
                </div>
              )}
              
              <button 
                onClick={() => triggerJob(selectedJob.id)}
                disabled={running === selectedJob.id}
                style={{
                  marginTop: '1rem', padding: '0.5rem 1rem',
                  background: running === selectedJob.id ? 'var(--border)' : 'var(--ok)',
                  color: '#fff', border: 'none', borderRadius: 'var(--radius)',
                  fontSize: '0.85rem', fontWeight: 600,
                  cursor: running === selectedJob.id ? 'not-allowed' : 'pointer',
                }}
              >
                {running === selectedJob.id ? 'Running…' : '▶ Run Now'}
              </button>
              <button
                onClick={() => { deleteJob(selectedJob.id, selectedJob.name); setSelectedJob(null); }}
                disabled={deleting === selectedJob.id}
                style={{
                  marginTop: '0.5rem', padding: '0.5rem 1rem',
                  background: '#7f1d1d', color: '#fca5a5', border: 'none', borderRadius: 'var(--radius)',
                  fontSize: '0.85rem', fontWeight: 600,
                  cursor: deleting === selectedJob.id ? 'not-allowed' : 'pointer',
                }}
              >
                {deleting === selectedJob.id ? 'Deleting…' : '🗑 Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
