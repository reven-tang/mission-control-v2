/**
 * Monitoring API Routes - Routing Stats
 */

import { NextResponse } from 'next/server';
import { getRoutingStats } from '@/lib/services/agent-router';

// GET /api/monitoring/routing/stats - 路由统计数据
export async function GET() {
  try {
    const stats = getRoutingStats();
    
    // Mock 数据（实际应从数据库统计）
    const mockStats = {
      totalRouted: 127,
      successCount: 124,
      failureCount: 3,
      successRate: 97.6,
      avgRoutingTime: 1.2,
      byDomain: {
        research: { count: 45, success: 44, failed: 1 },
        script: { count: 38, success: 38, failed: 0 },
        visual: { count: 22, success: 21, failed: 1 },
        publish: { count: 15, success: 15, failed: 0 },
        video: { count: 7, success: 6, failed: 1 },
      },
      recentRoutes: Array.from({ length: 10 }, (_, i) => ({
        taskId: `task_${1000 + i}`,
        agentId: ['quill-agent', 'pixel-agent', 'publisher-agent'][Math.floor(Math.random() * 3)],
        domain: ['research', 'script', 'visual', 'publish'][Math.floor(Math.random() * 4)],
        success: Math.random() > 0.1,
        duration: Math.round(Math.random() * 50 + 10),
        timestamp: Date.now() - i * 60000
      }))
    };

    return NextResponse.json({ success: true, data: mockStats });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
