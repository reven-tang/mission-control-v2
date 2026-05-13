/**
 * Agent Health Panel Component
 */

'use client';

import { useAgentHealth } from '@/lib/hooks/useAgentHealth';

const STATUS_COLORS = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  busy: 'bg-yellow-500'
};

const STATUS_LABELS = {
  online: '在线',
  offline: '离线',
  busy: '忙碌'
};

export function AgentHealthPanel() {
  const { agentList, onlineCount, busyCount, totalCount, connected, error, refresh } = useAgentHealth();

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">智能体健康</h2>
        <div className="flex gap-2 items-center">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-500">{connected ? '实时' : '离线'}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-gray-50 rounded p-2">
          <div className="text-2xl font-mono text-green-500">{onlineCount}</div>
          <div className="text-xs text-gray-500">在线</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="text-2xl font-mono text-yellow-500">{busyCount}</div>
          <div className="text-xs text-gray-500">忙碌</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="text-2xl font-mono">{totalCount}</div>
          <div className="text-xs text-gray-500">总计</div>
        </div>
      </div>

      <div className="space-y-2">
        {agentList.map(agent => (
          <div key={agent.agentId} className="border rounded p-2 flex items-center justify-between">
            <div>
              <span className={`w-2 h-2 rounded-full inline-block mr-2 ${STATUS_COLORS[agent.status]}`} />
              <span className="font-medium">{agent.agentId}</span>
              <span className="text-xs text-gray-400 ml-2">[{agent.domains.join(', ')}]</span>
            </div>
            <div className="flex gap-3 text-sm">
              <span className={agent.cpu > 70 ? 'text-red-500' : 'text-gray-500'}>
                CPU {Math.round(agent.cpu)}%
              </span>
              <span className={agent.memory > 70 ? 'text-red-500' : 'text-gray-500'}>
                Mem {Math.round(agent.memory)}%
              </span>
              <span className="text-gray-400">
                ✅{agent.tasksCompleted} ❌{agent.tasksFailed}
              </span>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
