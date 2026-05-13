/**
 * Monitoring API Routes - Self-Healing Events
 */

import { NextResponse } from 'next/server';

// GET /api/monitoring/self-healing/events - 自愈事件流
export async function GET() {
  try {
    // Mock 数据（实际应从数据库/日志系统获取）
    const mockEvents = Array.from({ length: 20 }, (_, i) => {
      const actions: Array<'retry' | 'reroute' | 'escalate' | 'abort'> = ['retry', 'retry', 'retry', 'reroute', 'escalate', 'abort'];
      const action = actions[Math.floor(Math.random() * actions.length)];
      const errorTypes: Array<'timeout' | 'capability_mismatch' | 'rate_limit' | 'internal_error' | 'unknown'> = 
        ['timeout', 'timeout', 'capability_mismatch', 'rate_limit', 'internal_error', 'unknown'];
      const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];

      return {
        id: `heal_${1000 + i}`,
        taskId: `task_${Math.floor(Math.random() * 100)}`,
        agentId: ['quill-agent', 'pixel-agent', 'publisher-agent', 'hyper-agent'][Math.floor(Math.random() * 4)],
        action,
        errorType,
        retryCount: action === 'retry' ? Math.floor(Math.random() * 3) + 1 : 0,
        reason: `${errorType} detected, ${action} executed`,
        timestamp: Date.now() - i * 300000,
        duration: action === 'retry' ? Math.round(Math.random() * 2000 + 500) : Math.round(Math.random() * 5000 + 1000)
      };
    });

    return NextResponse.json({ success: true, data: mockEvents });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
