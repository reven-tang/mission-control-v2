import { listTasks } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import type { Task } from '@/lib/types';

/**
 * GET /api/tasks/log
 *
 * Returns all tasks sorted by priority + recency,
 * with highest-priority incomplete tasks first.
 *
 * Query params:
 *   ?status=todo            — filter by status
 *   ?priority=3             — filter by priority (≥ value)
 *   ?incomplete=1           — only incomplete (status !== 'done')
 *   ?limit=20               — max results
 *   ?sort=priority_desc|created_desc|updated_desc
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as any;
    const minPriority = searchParams.get('priority') ? Number(searchParams.get('priority')) : undefined;
    const incompleteOnly = searchParams.get('incomplete') === '1';
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50;
    const sort = searchParams.get('sort') || 'priority_desc';

    let tasks = listTasks({ status, priority: minPriority });

    // Filter incomplete
    if (incompleteOnly) {
      tasks = tasks.filter(t => t.status !== 'done');
    }

    // Sort
    switch (sort) {
      case 'priority_desc':
        tasks.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || b.created_at - a.created_at);
        break;
      case 'created_desc':
        tasks.sort((a, b) => b.created_at - a.created_at);
        break;
      case 'updated_desc':
        tasks.sort((a, b) => (b.updated_at || b.created_at) - (a.updated_at || a.created_at));
        break;
      default:
        tasks.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || b.created_at - a.created_at);
    }

    // Limit
    const total = tasks.length;
    tasks = tasks.slice(0, limit);

    // Enrich each task with a computed `rank` field
    const enriched: (Task & { rank: number; completed: boolean })[] = tasks.map((t, i) => ({
      ...t,
      rank: i + 1,
      completed: t.status === 'done',
    }));

    // Summary stats
    const summary = {
      total,
      returned: enriched.length,
      by_status: {} as Record<string, number>,
      by_priority: {} as Record<number, number>,
      highest_priority_incomplete: enriched.find(t => !t.completed) || null,
    };

    const allTasks = listTasks();
    for (const t of allTasks) {
      summary.by_status[t.status] = (summary.by_status[t.status] || 0) + 1;
      summary.by_priority[t.priority ?? 0] = (summary.by_priority[t.priority ?? 0] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      data: enriched,
      summary,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, timestamp: Date.now() },
      { status: 500 }
    );
  }
}
