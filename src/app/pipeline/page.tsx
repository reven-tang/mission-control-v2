'use client';

import { useState, useEffect, useCallback } from 'react';

const STAGES = [
  { id: 'research', label: 'Research', desc: 'Quill Agent', color: '#3b82f6', icon: '🔍' },
  { id: 'script', label: 'Script', desc: 'Content generation', color: '#8b5cf6', icon: '📝' },
  { id: 'visual', label: 'Visual', desc: 'Pixel Agent', color: '#f59e0b', icon: '🎨' },
  { id: 'publish', label: 'Publish', desc: 'Multi-platform', color: '#22c55e', icon: '🚀' },
];

type PipelineRun = {
  id: string;
  title: string;
  topic: string;
  current_stage: string;
  status: string;
  created_at: number;
  updated_at: number;
};

type ContentPiece = {
  id: string;
  pipeline_id: string;
  stage: string;
  title: string;
  content: string;
  assets: Record<string, string>;
  status: string;
};

export default function PipelinePage() {
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [runningId, setRunningId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<PipelineRun | null>(null);
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [piecesLoading, setPiecesLoading] = useState(false);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pipeline');
      const data = await res.json();
      if (data.success) setRuns(data.data || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const fetchPieces = async (pipelineId: string) => {
    setPiecesLoading(true);
    try {
      const res = await fetch(`/api/pipeline/${pipelineId}/pieces`);
      const data = await res.json();
      if (data.success) setPieces(data.data || []);
    } catch { setPieces([]); }
    setPiecesLoading(false);
  };

  const selectRun = (run: PipelineRun) => {
    setSelectedRun(run);
    fetchPieces(run.id);
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deletePipeline = async (id: string) => {
    if (!confirm('删除此 Pipeline？')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/pipeline?id=${id}`, { method: 'DELETE' });
      setRuns(runs.filter(r => r.id !== id));
      if (selectedRun?.id === id) setSelectedRun(null);
    } catch {}
    setDeletingId(null);
  };

  const createPipeline = async () => {
    if (!newTopic.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTopic, topic: newTopic, metadata: {} }),
      });
      const data = await res.json();
      if (data.success) {
        // Pipeline 已自动完成，刷新列表
        await fetchRuns();
        setNewTopic('');
        // 自动选中新建的 pipeline
        if (data.data) {
          setSelectedRun(data.data);
          fetchPieces(data.data.id);
        }
      }
    } catch {}
    setCreating(false);
  };

  const advanceStage = async (id: string) => {
    setRunningId(id);
    try {
      const res = await fetch(`/api/pipeline/${id}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'advance' }),
      });
      const data = await res.json();
      if (data.success) {
        setRuns(runs.map(r => r.id === id ? data.data : r));
        if (selectedRun?.id === id) setSelectedRun(data.data);
      }
    } catch {}
    setRunningId(null);
  };

  const getStageProgress = (currentStage: string) => {
    const idx = STAGES.findIndex(s => s.id === currentStage);
    return ((idx + 1) / STAGES.length) * 100;
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Content Pipeline</h1>
        <span className="badge badge-gray">{runs.length} runs</span>
      </div>

      {/* 创建新 Pipeline */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="输入主题..."
            style={{
              flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.85rem',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)', color: 'var(--text)',
            }}
          />
          <button onClick={createPipeline} disabled={creating || !newTopic.trim()} className="btn btn-primary">
            {creating ? '创建...' : '+ 新建'}
          </button>
        </div>
      </div>

      {/* 流程展示 */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {STAGES.map(stage => (
            <div key={stage.id} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', border: `1px solid var(--border)`, borderLeft: `3px solid ${stage.color}` }}>
              <div style={{ fontSize: '1.2rem' }}>{stage.icon}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{stage.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 两栏布局：历史清单 + 详情面板 */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedRun ? '1fr 1fr' : '1fr', gap: '1rem' }}>
        {/* 历史清单 */}
        <div>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-strong)' }}>历史清单</h2>
          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>加载中...</div>
          ) : runs.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
              暂无 Pipeline，创建一个开始
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {runs.map(run => (
                <div
                  key={run.id}
                  className="card"
                  onClick={() => selectRun(run)}
                  style={{
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    border: selectedRun?.id === run.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                    transition: 'border 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{run.title}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{formatDate(run.created_at)} · {run.topic}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span className={`badge ${run.status === 'completed' ? 'badge-green' : run.status === 'running' ? 'badge-amber' : 'badge-gray'}`}>
                        {run.status === 'completed' ? '✅ 完成' : run.status === 'running' ? '🔄 运行' : '⏳ 空闲'}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); deletePipeline(run.id); }} disabled={deletingId === run.id} style={{ padding: '0.2rem 0.4rem', fontSize: '0.65rem', background: '#7f1d1d', color: '#fca5a5', border: 'none', borderRadius: 'var(--radius-sm)', cursor: deletingId === run.id ? 'not-allowed' : 'pointer', opacity: deletingId === run.id ? 0.5 : 1 }}>
                        {deletingId === run.id ? '...' : '🗑'}
                      </button>
                    </div>
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ height: 5, background: 'var(--bg-elevated)', borderRadius: 3 }}>
                      <div style={{ width: `${getStageProgress(run.current_stage)}%`, height: '100%', background: STAGES.find(s => s.id === run.current_stage)?.color, borderRadius: 3, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--muted)', marginTop: '0.2rem', textAlign: 'right' }}>
                      {STAGES.find(s => s.id === run.current_stage)?.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 详情面板 */}
        {selectedRun && (
          <div>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-strong)' }}>
              详情 · {selectedRun.title}
              <button onClick={() => setSelectedRun(null)} style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: 'var(--muted)', cursor: 'pointer', border: 'none', background: 'none' }}>✕ 关闭</button>
            </h2>
            <div className="card" style={{ padding: '1rem' }}>
              {/* 基本信息 */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <div><span style={{ color: 'var(--muted)' }}>主题:</span> {selectedRun.topic}</div>
                  <div><span style={{ color: 'var(--muted)' }}>状态:</span> {selectedRun.status}</div>
                  <div><span style={{ color: 'var(--muted)' }}>阶段:</span> {STAGES.find(s => s.id === selectedRun.current_stage)?.label}</div>
                  <div><span style={{ color: 'var(--muted)' }}>创建:</span> {formatDate(selectedRun.created_at)}</div>
                </div>
              </div>

              {/* Content Pieces */}
              <h3 style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-strong)' }}>内容产物</h3>
              {piecesLoading ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--muted)' }}>加载中...</div>
              ) : pieces.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--muted)', fontSize: '0.8rem' }}>推进 Pipeline 后将产生内容产物</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {pieces.map(piece => (
                    <div key={piece.id} style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', borderLeft: `3px solid ${STAGES.find(s => s.id === piece.stage)?.color || '#ccc'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          {STAGES.find(s => s.id === piece.stage)?.icon} {STAGES.find(s => s.id === piece.stage)?.label}
                        </div>
                        <span className={`badge ${piece.status === 'published' ? 'badge-green' : 'badge-gray'}`}>{piece.status}</span>
                      </div>
                      {piece.content && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--muted)', maxHeight: '120px', overflow: 'auto', padding: '0.5rem', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                          {piece.content}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}