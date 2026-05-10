import Link from 'next/link';
import { getTaskService } from '@/lib/services/task';
import { getAgentService } from '@/lib/services/agent';
import { getSystemService } from '@/lib/services/system';
import type { Task } from '@/lib/types';

export const revalidate = 0;

export default async function HomePage() {
  const [tasks, agents, system] = await Promise.all([
    getTaskService().list(),
    getAgentService().getAgents(),
    getSystemService().getStats(),
  ]);

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Mission Control</h1>
        <span className="badge badge-gray">{new Date().toLocaleDateString('zh-CN')}</span>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        {[
          { label: 'Total Tasks', value: stats.total },
          { label: 'To Do', value: stats.todo },
          { label: 'In Progress', value: stats.in_progress },
          { label: 'Done', value: stats.done },
        ].map(k => (
          <div key={k.label} className="kpi">
            <div>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value">{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* Recent Tasks — clickable */}
        <div className="card">
          <div className="card-head">
            <span className="card-label">Recent Tasks</span>
            <Link href="/kanban" className="card-link">View all →</Link>
          </div>
          <div className="task-list">
            {tasks.slice(0, 6).map(task => (
              <Link key={task.id} href={`/kanban?task=${task.id}`} className="task-item" style={{ textDecoration: 'none' }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: task.status === 'done' ? 'var(--ok)' :
                    task.status === 'in_progress' ? 'var(--warn)' :
                    task.status === 'review' ? '#7c3aed' : 'var(--muted-strong)',
                }} />
                <span className="task-title">{task.title}</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                  {new Date(task.created_at).toLocaleDateString('zh-CN')}
                </span>
                <span className={`badge ${task.status === 'done' ? 'badge-green' : task.status === 'in_progress' ? 'badge-amber' : 'badge-gray'}`}>
                  {task.status}
                </span>
              </Link>
            ))}
            {tasks.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-strong)', fontSize: '0.85rem' }}>No tasks yet</div>
            )}
          </div>
        </div>

        {/* Side Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* System */}
          <div className="card">
            <div className="card-head"><span className="card-label">System</span></div>
            {[
              { label: 'CPU', value: system.cpu_usage, warn: 80 },
              { label: 'Memory', value: system.memory_usage, warn: 90 },
            ].map(bar => (
              <div key={bar.label} style={{ marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span className="stat-label">{bar.label}</span>
                  <span className="stat-value" style={{ color: bar.value > bar.warn ? 'var(--danger)' : 'var(--accent)' }}>{bar.value}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-bar" style={{ width: `${bar.value}%`, background: bar.value > bar.warn ? 'var(--danger)' : 'var(--accent)' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Quick Nav */}
          <div className="card">
            <div className="card-head"><span className="card-label">Quick Nav</span></div>
            <div className="qnav">
              {[
                { href: '/kanban', label: 'Kanban', key: 'K' },
                { href: '/brain', label: 'Brain', key: 'B' },
                { href: '/agents', label: 'Agents', key: 'A' },
                { href: '/cron', label: 'Cron', key: 'C' },
                { href: '/healthcheck', label: 'Health', key: 'H' },
                { href: '/skills', label: 'Skills', key: 'S' },
                { href: '/brief', label: 'Brief', key: 'R' },
                { href: '/system', label: 'System', key: 'Y' },
              ].map(a => (
                <Link key={a.href} href={a.href} className="qnav-item">
                  <span className="qnav-key">{a.key}</span>
                  <span>{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
