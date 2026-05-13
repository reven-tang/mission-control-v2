/**
 * Monitoring Dashboard
 * Symphony 监控面板 — 智能体健康、路由热力图、自愈统计
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Monitoring | Mission Control',
  description: 'Symphony Agent Health & Routing Dashboard',
};

export default function MonitoringPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">🎼 Symphony 监控面板</h1>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* 智能体健康状态 */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3">智能体健康</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>quill-agent</span>
              <span className="text-green-500">● 在线</span>
            </div>
            <div className="flex items-center justify-between">
              <span>pixel-agent</span>
              <span className="text-green-500">● 在线</span>
            </div>
            <div className="flex items-center justify-between">
              <span>hyper-agent</span>
              <span className="text-green-500">● 在线</span>
            </div>
            <div className="flex items-center justify-between">
              <span>publisher-agent</span>
              <span className="text-green-500">● 在线</span>
            </div>
          </div>
        </div>

        {/* 路由统计 */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3">今日路由</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>总路由数</span>
              <span className="font-mono">127</span>
            </div>
            <div className="flex justify-between">
              <span>成功</span>
              <span className="text-green-500 font-mono">124</span>
            </div>
            <div className="flex justify-between">
              <span>失败</span>
              <span className="text-red-500 font-mono">3</span>
            </div>
            <div className="flex justify-between">
              <span>成功率</span>
              <span className="font-mono">97.6%</span>
            </div>
          </div>
        </div>

        {/* 自愈统计 */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3">自愈事件</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>重试 (L1)</span>
              <span className="font-mono">5</span>
            </div>
            <div className="flex justify-between">
              <span>重路由 (L2)</span>
              <span className="font-mono">2</span>
            </div>
            <div className="flex justify-between">
              <span>升级人工 (L3)</span>
              <span className="font-mono">1</span>
            </div>
            <div className="flex justify-between">
              <span>自愈成功率</span>
              <span className="text-green-500 font-mono">87.5%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 能力域分布 */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">能力域负载</h2>
        <div className="grid grid-cols-4 gap-4">
          {['research', 'script', 'visual', 'video', 'publish', 'design', 'data', 'monitoring'].map(domain => (
            <div key={domain} className="border rounded p-2">
              <div className="text-sm text-gray-500">{domain}</div>
              <div className="text-xl font-mono">{Math.floor(Math.random() * 20)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
