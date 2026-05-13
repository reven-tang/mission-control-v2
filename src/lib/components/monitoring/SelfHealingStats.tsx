/**
 * Self-Healing Stats Component
 */

'use client';

import { useSelfHealingEvents, SelfHealingEvent } from '@/lib/hooks/useSelfHealingEvents';

const ACTION_COLORS = {
  retry: 'bg-blue-500',
  reroute: 'bg-yellow-500',
  escalate: 'bg-red-500',
  abort: 'bg-gray-500'
};

const ACTION_LABELS = {
  retry: '重试',
  reroute: '重路由',
  escalate: '升级',
  abort: '终止'
};

function HealingEventItem({ event }: { event: SelfHealingEvent }) {
  return (
    <div className="flex items-center justify-between py-2 border-b">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${ACTION_COLORS[event.action]}`} />
        <span className="font-mono text-sm">{event.taskId}</span>
        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
          {ACTION_LABELS[event.action]}
        </span>
      </div>
      <div className="text-right">
        <div className="text-sm">{event.agentId}</div>
        <div className="text-xs text-gray-400">
          {new Date(event.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

export function SelfHealingStats() {
  const { events, stats, connected } = useSelfHealingEvents();

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">自愈事件</h2>
        <div className="flex gap-2 items-center">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-500">{connected ? '实时' : '离线'}</span>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="bg-blue-50 rounded p-2 text-center">
          <div className="text-xl font-mono text-blue-500">{stats.retry}</div>
          <div className="text-xs text-gray-500">重试 (L1)</div>
        </div>
        <div className="bg-yellow-50 rounded p-2 text-center">
          <div className="text-xl font-mono text-yellow-500">{stats.reroute}</div>
          <div className="text-xs text-gray-500">重路由 (L2)</div>
        </div>
        <div className="bg-red-50 rounded p-2 text-center">
          <div className="text-xl font-mono text-red-500">{stats.escalate}</div>
          <div className="text-xs text-gray-500">升级 (L3)</div>
        </div>
        <div className="bg-gray-50 rounded p-2 text-center">
          <div className="text-xl font-mono text-gray-600">{stats.abort}</div>
          <div className="text-xs text-gray-500">终止</div>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-sm">
          <span>自愈成功率</span>
          <span className="font-mono font-bold text-green-500">{stats.successRate}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span>平均恢复时间</span>
          <span className="font-mono">{stats.avgRecoveryTime}ms</span>
        </div>
      </div>

      {/* 事件列表 */}
      <div className="border rounded max-h-64 overflow-y-auto">
        {events.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">暂无自愈事件</div>
        ) : (
          events.map(event => (
            <HealingEventItem key={event.id} event={event} />
          ))
        )}
      </div>
    </div>
  );
}
