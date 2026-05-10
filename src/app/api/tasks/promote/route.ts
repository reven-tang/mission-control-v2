import { NextResponse } from 'next/server';
import { getTaskService } from '@/lib/services/task';

export async function POST() {
  try {
    const service = getTaskService();
    const promoted = await service.promoteHighPriorityToTodo();
    return NextResponse.json({
      success: true,
      data: { promoted_count: promoted.length, tasks: promoted },
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 500 });
  }
}
