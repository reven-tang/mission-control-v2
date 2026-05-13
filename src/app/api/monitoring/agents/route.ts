/**
 * Monitoring API Routes
 * 提供监控面板的实时数据接口
 */

import { NextResponse } from 'next/server';
import { listOnlineAgents, getAgent } from '@/lib/services/agent-registry';
import { getRoutingStats } from '@/lib/services/agent-router';

// GET /api/monitoring/agents - 智能体健康状态
export async function GET() {
  try {
    const agents = listOnlineAgents();
    const healthData = agents.map(agent => ({
      agentId: agent.agentId,
      status: agent.status,
      domains: agent.domains,
      skills: agent.skills,
      priority: agent.priority,
      maxConcurrent: agent.maxConcurrent,
      lastSeen: Date.now(),
      tasksCompleted: 0, // TODO: 从数据库统计
      tasksFailed: 0,
      cpu: Math.random() * 30, // Mock: 实际应从系统获取
      memory: Math.random() * 20, // Mock
    }));

    return NextResponse.json({ success: true, data: healthData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
