/**
 * Monitoring Dashboard - Real-time Version
 * Symphony 监控面板 — 实时数据刷新
 */

import { Metadata } from 'next';
import { AgentHealthPanel } from '@/lib/components/monitoring/AgentHealth';
import { RoutingHeatmap } from '@/lib/components/monitoring/RoutingHeatmap';
import { SelfHealingStats } from '@/lib/components/monitoring/SelfHealingStats';

export const metadata: Metadata = {
  title: 'Monitoring | Mission Control',
  description: 'Symphony Agent Health & Routing Dashboard',
};

export default function MonitoringPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">🎼 Symphony 监控面板</h1>
      
      <div className="mb-6 flex gap-4">
        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm">
          🔄 实时刷新 (5s)
        </span>
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm">
          ✅ WebSocket 连接
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 智能体健康状态 */}
        <AgentHealthPanel />

        {/* 自愈事件统计 */}
        <SelfHealingStats />
      </div>

      {/* 路由热力图 */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">路由热力图</h2>
        <RoutingHeatmap />
      </div>
    </div>
  );
}
