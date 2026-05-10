import { NextRequest, NextResponse } from 'next/server';
import { getTaskService } from '@/lib/services/task';
import type { TaskStatus } from '@/lib/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body as { status: TaskStatus };
    if (!status || !['backlog', 'todo', 'in_progress', 'review', 'done'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }
    const service = getTaskService();
    const task = await service.move(id, status);
    return NextResponse.json({ success: true, data: task, timestamp: Date.now() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 404 });
  }
}
