import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/db';

// GET /api/calendar — today's tasks + cron history
export async function GET() {
  try {
    const store: any = getStore();
    const allTasks = store.tasks || [];
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = allTasks.filter((t: any) => new Date(t.created_at).toISOString().split('T')[0] === today);
    const briefHistory = store.brief_history || [];

    const dist: Record<string, number> = { backlog: 0, todo: 0, in_progress: 0, review: 0, done: 0 };
    for (const t of allTasks) { dist[t.status] = (dist[t.status] || 0) + 1; }

    return NextResponse.json({
      success: true,
      data: {
        today: todayTasks,
        distribution: dist,
        recentRuns: briefHistory.slice(-5).reverse(),
        total: allTasks.length,
      },
      timestamp: Date.now(),
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message, timestamp: Date.now() }, { status: 500 });
  }
}
