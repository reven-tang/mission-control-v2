'use client';

import { useState, useEffect, useCallback } from 'react';

type PainPoint = {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  source_url: string;
  engagement: { upvotes?: number; comments?: number; score?: number };
  tags: string[];
  discovered_at: number;
  status: 'discovered' | 'validated' | 'shipped';
};

type Opportunity = {
  id: string;
  pain_point_ids: string[];
  title: string;
  description: string;
  score: number;
  mvp_task_title: string;
  created_at: number;
  status: 'idea' | 'building' | 'shipped';
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'var(--danger)',
  high: 'var(--warn)',
  medium: 'var(--accent)',
  low: 'var(--muted-strong)',
};

const SEVERITY_BG: Record<string, string> = {
  critical: 'rgba(239,68,68,0.12)',
  high: 'rgba(245,158,11,0.12)',
  medium: 'rgba(59,130,246,0.12)',
  low: 'rgba(100,116,139,0.12)',
};

export default function ResearchPage() {
  const [pains, setPains] = useState<PainPoint[]>([]);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [activeTab, setActiveTab] = useState<'pain' | 'opp'>('pain');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [pr, or_] = await Promise.all([
      fetch('/api/research'),
      fetch('/api/opportunities'),
    ]);
    const prj = await pr.json();
    const orj = await or_.json();
    setPains(prj.success ? prj.data : []);
    setOpps(orj.success ? orj.data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function importSeedData() {
    const seeds = [
      {
        title: 'Cost & Trace 监控缺失',
        description: 'AI agents 容易构建，但难以追踪成本和执行 trace。用户抱怨不知道某个任务为什么花了 $4.70 而不是预期的 $0.12，无法定位是哪次 API 调用造成的。',
        source: 'Reddit · r/AI_Agents + r/crewai',
        source_url: 'https://www.reddit.com/r/AI_Agents/comments/1sqkhzh/ai_agents_are_easy_to_build_but_hard_to_monitor/',
        engagement: { upvotes: 9, comments: 27, score: 8 },
        tags: ['observability', 'cost-tracking', 'tracing'],
        severity: 'critical' as const,
      },
      {
        title: '公司上下文记忆缺失',
        description: '部署 AI agent 后，对内部政策、历史决策、过去项目一无所知。每次都要重新提供上下文，或导致 hallucination 回答。',
        source: 'Reddit · r/LangChain',
        source_url: 'https://www.reddit.com/r/LangChain/comments/1t6e0ak/built_an_ai_agent_for_a_client_it_was_smart_but/',
        engagement: { upvotes: 7, comments: 5, score: 5 },
        tags: ['context', 'memory', 'hallucination'],
        severity: 'critical' as const,
      },
      {
        title: 'AI Wellbeing 评测方法论有缺陷',
        description: '试图在"真空"中测量 AI 的"功能性愉悦和痛苦"是错误的研究路径。58-turn 研究设计无法测量真实连续性感知，社区批评实验设计有根本性缺陷。',
        source: 'Reddit · r/claudexplorers',
        source_url: 'https://www.reddit.com/r/claudexplorers/comments/1t0w40y/a_critique_of_ai_wellbeing_measuring_and/',
        engagement: { upvotes: 40, comments: 11, score: 6 },
        tags: ['evaluation', 'methodology', 'benchmark'],
        severity: 'medium' as const,
      },
      {
        title: 'AI 工具选型碎片化',
        description: '用户在不同场景被迫切换不同 AI 工具：Claude 写代码、Perplexity 做研究、ChatGPT 做快速问答。工作流分散，缺乏统一入口。',
        source: 'Reddit · r/micro_saas',
        source_url: 'https://www.reddit.com/r/micro_saas/comments/1t5diqu/im_stuck_between_a_real_pain_point_and_a_weak_mvp/',
        engagement: { upvotes: 3, comments: 14, score: 4 },
        tags: ['workflow', 'tool-fragmentation', 'ux'],
        severity: 'high' as const,
      },
      {
        title: 'AI Agent 安全平台产品化困难',
        description: '构建 AI agent 安全平台时发现：安全风险模型比技术实现更难理解。在产品就绪前，需要先搞清楚"agent 行为模式"这一未知领域。',
        source: 'Reddit · r/buildinpublic',
        source_url: 'https://www.reddit.com/r/buildinpublic/comments/1t3wzio/what_i_learned_building_an_ai_agent_security/',
        engagement: { upvotes: 1, comments: 6, score: 3 },
        tags: ['security', 'agent-behavior', 'risk-model'],
        severity: 'medium' as const,
      },
    ];

    const res = await fetch('/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: seeds }),
    });
    if (res.ok) fetchData();
  }

  async function createOpportunity(title: string, desc: string, painIds: string[]) {
    const res = await fetch('/api/opportunities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: desc, pain_point_ids: painIds, score: 70 }),
    });
    if (res.ok) { setOpps(await (await fetch('/api/opportunities')).json().then(r => r.data)); }
  }

  async function buildMvp(oppId: string) {
    const res = await fetch(`/api/opportunities?id=${oppId}&action=build-mvp`, { method: 'POST' });
    if (res.ok) alert('✅ MVP task created in Kanban!');
  }

  async function deletePain(id: string) {
    const res = await fetch(`/api/research?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setPains(p => p.filter(x => x.id !== id));
    } else {
      const data = await res.json().catch(() => ({}));
      alert('❌ 删除失败: ' + (data.error || res.statusText || 'unknown'));
    }
  }

  if (loading) return <div className="page"><div className="loading">Loading research data…</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Market Research</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {pains.length === 0 && (
            <button className="btn btn-primary" onClick={importSeedData}>📥 Import Seed Data</button>
          )}
          <button className="btn btn-secondary" onClick={fetchData}>↻ Refresh</button>
        </div>
      </div>

      {/* Summary bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {(['critical','high','medium','low'] as const).map(sev => {
          const count = pains.filter(p => p.severity === sev).length;
          return (
            <div key={sev} style={{
              padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)',
              background: SEVERITY_BG[sev], border: `1px solid ${SEVERITY_COLOR[sev]}40`,
              fontSize: '0.8rem', fontWeight: 600, color: SEVERITY_COLOR[sev],
            }}>
              {sev.toUpperCase()} · {count}
            </div>
          );
        })}
        <div style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', background: 'var(--card)', border: '1px solid var(--border)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>
          Total: {pains.length}
        </div>
        <div style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', background: 'var(--accent-subtle)', border: '1px solid var(--accent)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent)' }}>
          Opportunities: {opps.length}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '1rem' }}>
        {(['pain','opp'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '0.5rem 1.25rem', border: 'none', background: activeTab === tab ? 'var(--accent)' : 'var(--bg-elevated)',
            color: activeTab === tab ? '#fff' : 'var(--text)', cursor: 'pointer', fontWeight: 600,
            borderTopLeftRadius: tab === 'pain' ? 'var(--radius)' : 0,
            borderTopRightRadius: tab === 'opp' ? 'var(--radius)' : 0,
            fontSize: '0.85rem',
          }}>
            {tab === 'pain' ? '🔴 Pain Points' : '💡 Opportunities'}
          </button>
        ))}
      </div>

      {activeTab === 'pain' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {pains.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔬</div>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No pain points yet</div>
              <div style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Import seed data or connect a research pipeline.</div>
              <button className="btn btn-primary" onClick={importSeedData}>📥 Import Seed Data</button>
            </div>
          )}
          {pains.map(pp => (
            <div key={pp.id} className="card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{
                width: 4, borderRadius: 2, background: SEVERITY_COLOR[pp.severity], flexShrink: 0, height: '100%', minHeight: 40,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700,
                    background: SEVERITY_BG[pp.severity], color: SEVERITY_COLOR[pp.severity], textTransform: 'uppercase',
                  }}>{pp.severity}</span>
                  <span style={{
                    padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700,
                    background: pp.status === 'shipped' ? 'var(--ok-subtle)' : pp.status === 'validated' ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                    color: pp.status === 'shipped' ? 'var(--ok)' : pp.status === 'validated' ? 'var(--accent)' : 'var(--muted-strong)',
                  }}>{pp.status}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{pp.source}</span>
                  {(pp.engagement.comments ?? 0) > 0 && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                      💬 {pp.engagement.comments} · 👍 {pp.engagement.upvotes || 0}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '0.3rem' }}>{pp.title}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.5, marginBottom: '0.5rem' }}>{pp.description}</div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  {pp.tags.map(t => <span key={t} style={{ padding: '0.1rem 0.4rem', borderRadius: 3, fontSize: '0.68rem', background: 'var(--bg-elevated)', color: 'var(--muted-strong)' }}>{t}</span>)}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }} onClick={() => createOpportunity(
                    `Solve: ${pp.title}`, pp.description, [pp.id]
                  )}>💡 Create Opportunity</button>
                  <button className="btn btn-ghost" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', color: 'var(--danger)' }} onClick={() => deletePain(pp.id)}>Delete</button>
                  {pp.source_url && <a href={pp.source_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--accent)', alignSelf: 'center' }}>↗ Source</a>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {opps.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💡</div>
              <div style={{ fontWeight: 600 }}>No opportunities yet</div>
              <div style={{ fontSize: '0.85rem' }}>Create opportunities from pain points above.</div>
            </div>
          )}
          {opps.map(opp => {
            const linkedPains = opp.pain_point_ids.map(pid => pains.find(p => p.id === pid)).filter(Boolean) as PainPoint[];
            return (
              <div key={opp.id} className="card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-subtle)', border: '1px solid var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)', flexShrink: 0,
                }}>{opp.score}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{opp.title}</span>
                    <span style={{
                      padding: '0.1rem 0.4rem', borderRadius: 3, fontSize: '0.65rem', fontWeight: 700,
                      background: opp.status === 'building' ? 'var(--warn-subtle)' : 'var(--bg-elevated)',
                      color: opp.status === 'building' ? 'var(--warn)' : 'var(--muted-strong)',
                    }}>{opp.status}</span>
                  </div>
                  {linkedPains.length > 0 && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      {linkedPains.map(p => (
                        <span key={p.id} style={{
                          display: 'inline-block', marginRight: '0.4rem', marginBottom: '0.2rem',
                          padding: '0.1rem 0.4rem', borderRadius: 3, fontSize: '0.7rem',
                          background: SEVERITY_BG[p.severity], color: SEVERITY_COLOR[p.severity],
                        }}>🔴 {p.title}</span>
                      ))}
                    </div>
                  )}
                  {opp.description && <div style={{ fontSize: '0.82rem', color: 'var(--text)', marginBottom: '0.5rem', lineHeight: 1.5 }}>{opp.description}</div>}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {opp.status === 'idea' && (
                      <button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }} onClick={() => buildMvp(opp.id)}>
                        🚀 Build MVP
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
