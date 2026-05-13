/**
 * Routing Heatmap Component
 */

'use client';

import { useRoutingStats } from '@/lib/hooks/useRoutingStats';

export function RoutingHeatmap() {
  const { stats, isLoading, isError } = useRoutingStats(5000);

  if (isLoading || !stats) {
    return <div className="p-8 text-center text-gray-500">加载中...</div>;
  }

  if (isError) {
    return <div className="p-8 text-center text-red-500">加载失败</div>;
  }

  return (
    <div>
      {/* 核心指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="border rounded p-3">
          <div className="text-sm text-gray-500">总路由数</div>
          <div className="text-xl font-mono">{stats.totalRouted}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-sm text-gray-500">成功率</div>
          <div className="text-xl font-mono text-green-500">{stats.successRate}%</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-sm text-gray-500">平均耗时</div>
          <div className="text-xl font-mono">{stats.avgRoutingTime}ms</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-sm text-gray-500">失败数</div>
          <div className="text-xl font-mono text-red-500">{stats.failureCount}</div>
        </div>
      </div>

      {/* 能力域分布 */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2">能力域分布</h3>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {Object.entries(stats.byDomain).map(([domain, data]) => {
            const successRate = data.count > 0 ? Math.round(data.success / data.count * 100) : 0;
            const color = successRate >= 95 ? 'bg-green-500' : successRate >= 80 ? 'bg-yellow-500' : 'bg-red-500';
            
            return (
              <div key={domain} className="border rounded p-2">
                <div className="text-xs text-gray-500 uppercase">{domain}</div>
                <div className="flex items-end gap-1 mt-1">
                  <div className="text-lg font-mono">{data.count}</div>
                  <div className={`w-2 h-2 rounded-full ${color}`} />
                </div>
                <div className="text-xs text-gray-400">{successRate}% 成功</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 最近路由 */}
      <div>
        <h3 className="text-sm font-semibold mb-2">最近路由</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">任务ID</th>
                <th className="p-2 text-left">智能体</th>
                <th className="p-2 text-left">域</th>
                <th className="p-2 text-left">状态</th>
                <th className="p-2 text-right">耗时</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentRoutes.map(route => (
                <tr key={route.taskId} className="border-t">
                  <td className="p-2 font-mono">{route.taskId}</td>
                  <td className="p-2">{route.agentId}</td>
                  <td className="p-2">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                      {route.domain}
                    </span>
                  </td>
                  <td className="p-2">
                    {route.success ? (
                      <span className="text-green-500">✅</span>
                    ) : (
                      <span className="text-red-500">❌</span>
                    )}
                  </td>
                  <td className="p-2 text-right font-mono">{route.duration}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
