import { NextRequest, NextResponse } from 'next/server';
import { listTasks } from '@/lib/db';
import { createTask, initializeKanban } from '@/lib/kanban/hooks';
import { CreateTaskSchema } from '@/lib/validation/schemas';

// GET /api/stories - list all tasks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as any;
    const priority = searchParams.get('priority') ? Number(searchParams.get('priority')) : undefined;
    const tasks = listTasks({ status, priority });
    return NextResponse.json({ success: true, data: tasks, timestamp: Date.now() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 500 });
  }
}

// POST /api/stories - create a new task
export async function POST(request: NextRequest) {
  try {
    // 确保 kanban hooks 已注册
    initializeKanban();

    const body = await request.json();
    const parsed = CreateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message || 'Invalid input', timestamp: Date.now() }, { status: 400 });
    }
    // 通过 kanban hooks 创建（触发分解+路由）
    const task = await createTask({
      title: parsed.data.title,
      description: parsed.data.description || '',
      tags: parsed.data.tags || [],
      priority: (parsed.data.priority ?? 0) as 0 | 1 | 2 | 3 | 4,
      source: parsed.data.source || 'manual',
      goal_id: parsed.data.goal_id,
    });
    return NextResponse.json({ success: true, data: task, timestamp: Date.now() }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 400 });
  }
}
