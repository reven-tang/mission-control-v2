import { NextRequest, NextResponse } from 'next/server';
import { getTaskService } from '@/lib/services/task';

// PATCH /api/stories/[id] - update a task
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const service = getTaskService();
    const body = await request.json();
    const task = await service.update(params.id, body);
    return NextResponse.json({ success: true, data: task, timestamp: Date.now() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 404 });
  }
}

// DELETE /api/stories/[id] - delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const service = getTaskService();
    await service.delete(params.id);
    return NextResponse.json({ success: true, timestamp: Date.now() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 404 });
  }
}