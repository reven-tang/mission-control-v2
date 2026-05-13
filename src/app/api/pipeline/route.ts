import { NextRequest, NextResponse } from 'next/server';
import { addPipelineRun, listPipelineRuns, getPipelineRun, deletePipelineRun } from '@/lib/db';
import { CreatePipelineRunSchema } from '@/lib/validation/schemas';
import { runPipeline } from '@/lib/services/pipeline-runner';

// GET /api/pipeline - list all pipeline runs
export async function GET() {
  try {
    const runs = listPipelineRuns();
    return NextResponse.json({ success: true, data: runs, timestamp: Date.now() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 500 });
  }
}

// DELETE /api/pipeline - delete a pipeline run
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    
    const run = getPipelineRun(id);
    if (!run) return NextResponse.json({ success: false, error: 'Pipeline not found' }, { status: 404 });
    
    deletePipelineRun(id);
    return NextResponse.json({ success: true, message: 'Pipeline deleted', timestamp: Date.now() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 500 });
  }
}

// POST /api/pipeline - create and auto-run pipeline
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreatePipelineRunSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message || 'Invalid input', timestamp: Date.now() }, { status: 400 });
    }
    const { title, topic, metadata } = parsed.data;

    if (!title || !topic) {
      return NextResponse.json({ success: false, error: 'title and topic required', timestamp: Date.now() }, { status: 400 });
    }

    const run = addPipelineRun({
      title,
      topic,
      current_stage: 'research',
      status: 'running',
      metadata: metadata || {},
    });

    // 自动推进全流程（使用新解耦的 PipelineRunner 服务）
    const result = await runPipeline(run.id, topic);

    const completedRun = getPipelineRun(run.id);
    return NextResponse.json({
      success: true,
      data: completedRun,
      wechat: result.wechatMediaId ? { media_id: result.wechatMediaId } : { error: result.error },
      message: result.success
        ? 'Pipeline completed, WeChat draft published'
        : result.error
          ? `Pipeline completed, WeChat failed: ${result.error}`
          : 'Pipeline auto-completed',
      timestamp: Date.now(),
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 400 });
  }
}
