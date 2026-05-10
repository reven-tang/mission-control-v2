import { getStore } from '@/lib/db';
import type { Task } from '@/lib/types';

export const revalidate = 0;

function getTodayTasks(tasks: Task[]): Task[] {
  const today = new Date().toISOString().split('T')[0];
  return tasks.filter(t => {
    const d = new Date(t.created_at).toISOString().split('T')[0];
    return d === today;
  });
}

export default async function CalendarPage() {
  const store: any = getStore();
  const allTasks: Task[] = store.tasks || [];
  const todayTasks = getTodayTasks(allTasks);

  // Mock cron runs from brief_history
  const briefHistory: any[] = store.brief_history || [];
  const recentRuns = briefHistory.slice(-5).reverse();

  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Calendar</h1>
      </div>

      <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="kpi">
          <div>
            <div className="kpi-value">{allTasks.length}</div>
            <div className="kpi-label">Total Tasks</div>
          </div>
        </div>
        <div className="kpi">
          <div>
            <div className="kpi-value">{todayTasks.length}</div>
            <div className="kpi-label">Today</div>
          </div>
        </div>
        <div className="kpi">
          <div>
            <div className="kpi-value">{allTasks.filter((t: Task) => t.status === 'done').length}</div>
            <div className="kpi-label">Completed</div>
          </div>
        </div>
        <div className="kpi">
          <div>
            <div className="kpi-value">{allTasks.filter((t: Task) => t.status === 'in_progress').length}</div>
            <div className="kpi-label">In Progress</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <span className="card-label">Today's Tasks — {dateStr}</span>
          </div>
          {todayTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>No tasks today</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {todayTasks.map(t => (
                <div key={t.id} className="task-item">
                  <span className={`dot ${t.status === 'done' ? 'dot-ok' : t.status === 'in_progress' ? 'dot-warn' : 'dot-mute'}`} />
                  <span className="task-title">{t.title}</span>
                  <span className={`badge ${t.status === 'done' ? 'badge-green' : t.status === 'in_progress' ? 'badge-amber' : 'badge-gray'}`}>{t.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <span className="card-label">Cron Execution History</span>
          </div>
          {recentRuns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>No execution history yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {recentRuns.map((r: any, i: number) => (
                <div key={i} className="task-item">
                  <span className="dot dot-ok" />
                  <span className="task-title">{r.name || r.type || 'Cron Job'}</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                    {r.timestamp ? new Date(r.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '0.75rem' }}>
        <div className="card-head">
          <span className="card-label">Status Distribution</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
          {['backlog','todo','in_progress','review','done'].map(s => {
            const n = allTasks.filter((t: Task) => t.status === s).length;
            const pct = allTasks.length ? Math.round(n / allTasks.length * 100) : 0;
            return (
              <div key={s}>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent)' }}>{n}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{s.replace('_', ' ')}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--muted-strong)' }}>{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
