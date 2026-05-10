import { NextRequest, NextResponse } from 'next/server';
import { listTasks, createTask, deleteTask } from '@/lib/db';

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
    const body = await request.json();
    const task = createTask(body);
    return NextResponse.json({ success: true, data: task, timestamp: Date.now() }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 400 });
  }
}

// DELETE /api/stories?id=xxx - delete a task by query param
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    const ok = deleteTask(id);
    if (!ok) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    return NextResponse.json({ success: true, timestamp: Date.now() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 500 });
  }
}
