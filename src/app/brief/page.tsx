'use client';

import { useState } from 'react';

export default function BriefPage() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/brief/trigger', { method: 'POST', signal: AbortSignal.timeout(15000) });
      const data = await res.json();
      setContent(data.content || JSON.stringify(data, null, 2));
    } catch (e: any) {
      setError(e.name === 'TimeoutError' ? 'Request timed out' : 'Service unavailable');
    }
    setLoading(false);
  };

  const sendToFeishu = async () => {
    if (!content) return;
    setSending(true);
    setError('');
    try {
      await fetch('/api/brief/trigger', { method: 'POST', signal: AbortSignal.timeout(10000) });
    } catch (e: any) {
      setError(e.name === 'TimeoutError' ? 'Send timed out' : 'Send failed');
    }
    setSending(false);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Daily Brief</h1>
      </div>

      {error && <div style={{ padding: '0.75rem 1rem', background: 'var(--danger-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '1rem' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button onClick={generate} disabled={loading} style={{
          padding: '0.6rem 1.25rem', background: loading ? 'var(--bg-elevated)' : 'var(--accent)',
          color: 'var(--accent-foreground)', border: 'none', borderRadius: 'var(--radius-sm)',
          fontSize: '0.8rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1, transition: 'background 0.15s, opacity 0.15s',
        }}>
          {loading ? 'Generating...' : 'Generate'}
        </button>
        <button onClick={sendToFeishu} disabled={sending || !content} style={{
          padding: '0.6rem 1.25rem', background: sending || !content ? 'var(--bg-elevated)' : 'var(--ok)',
          color: 'var(--accent-foreground)', border: 'none', borderRadius: 'var(--radius-sm)',
          fontSize: '0.8rem', fontWeight: 600, cursor: sending || !content ? 'not-allowed' : 'pointer',
          opacity: sending || !content ? 0.6 : 1, transition: 'background 0.15s, opacity 0.15s',
        }}>
          {sending ? 'Sending...' : 'Send to Feishu'}
        </button>
      </div>

      {content ? (
        <div className="card">
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.6, fontFamily: 'var(--font-body)', margin: 0 }}>{content}</pre>
        </div>
      ) : !error && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
          Click Generate to create daily brief
        </div>
      )}
    </div>
  );
}
