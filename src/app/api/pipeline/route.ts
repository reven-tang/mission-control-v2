import { NextRequest, NextResponse } from 'next/server';
import { addPipelineRun, listPipelineRuns, getPipelineRun, updatePipelineRun, addContentPiece, listContentPieces, deletePipelineRun } from '@/lib/db';
import { generateArticle, generateVisualDescription } from '@/lib/services/llm-content';
import { publishDraft } from '@/lib/services/wechat';
import { getThumbMediaIdForTopic } from '@/lib/services/stock-image';
import type { PipelineStage } from '@/lib/types';

const STAGE_ORDER: PipelineStage[] = ['research', 'script', 'visual', 'publish'];

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

// 自动推进 Pipeline 全流程（LLM 生成内容 + 微信草稿推送）
async function autoRunPipeline(runId: string, topic: string) {
  let wechatResult: { media_id?: string; error?: string } | null = null;
  let articleContent = '';

  // Research 阶段：LLM 生成文章（包含调研+写作）
  updatePipelineRun(runId, { current_stage: 'research', status: 'running', updated_at: Date.now() });
  try {
    articleContent = await generateArticle(topic);
    addContentPiece({
      pipeline_id: runId, stage: 'research', title: topic,
      content: `<h3>🔍 Research & 深度调研</h3><p>基于主题"${topic}"，通过 LLM 进行深度调研与写作。完整内容见 Script 阶段。</p>`,
      assets: {}, status: 'approved',
    });
  } catch (e: any) {
    articleContent = `<h2>${topic}</h2><p>（LLM 生成失败，使用模板内容）</p><h3>背景</h3><p>${topic}是当前关注焦点。</p>`;
    addContentPiece({
      pipeline_id: runId, stage: 'research', title: topic,
      content: `<h3>🔍 Research</h3><p>LLM调用失败:${e.message}</p>`,
      assets: {}, status: 'draft',
    });
  }

  // Script 阶段：文章内容
  updatePipelineRun(runId, { current_stage: 'script', status: 'running', updated_at: Date.now() });
  addContentPiece({
    pipeline_id: runId, stage: 'script', title: topic,
    content: articleContent, assets: {}, status: 'approved',
  });

  // Visual 阶段：搜索配图 + 上传微信素材库
  updatePipelineRun(runId, { current_stage: 'visual', status: 'running', updated_at: Date.now() });
  let visualContent = '';
  let thumbMediaId = '';
  try {
    visualContent = await generateVisualDescription(topic, articleContent);
    // 搜索并上传主题相关封面图
    thumbMediaId = await getThumbMediaIdForTopic(topic);
    console.log(`[Pipeline] Cover image: ${thumbMediaId.slice(0, 30)}...`);
  } catch (e: any) {
    visualContent = `<h3>🎨 Visual 配图方案</h3><p>为"${topic}"生成配图方案。</p>`;
    console.error(`[Pipeline] Image upload failed: ${e.message}`);
  }
  addContentPiece({
    pipeline_id: runId, stage: 'visual', title: topic,
    content: visualContent, assets: thumbMediaId ? { thumb_media_id: thumbMediaId } : {}, status: 'approved',
  });

  // Publish 阶段：推送到微信草稿箱
  updatePipelineRun(runId, { current_stage: 'publish', status: 'running', updated_at: Date.now() });
  addContentPiece({
    pipeline_id: runId, stage: 'publish', title: topic,
    content: articleContent, assets: {}, status: 'draft',
  });

  try {
    const result = await publishDraft([{ title: topic, content: articleContent, thumb_media_id: thumbMediaId || undefined }]);
    wechatResult = { media_id: result.media_id };
  } catch (e: any) {
    wechatResult = { error: e.message };
  }

  // 完成
  updatePipelineRun(runId, { status: 'completed', completed_at: Date.now(), updated_at: Date.now() });

  return wechatResult;
}

// POST /api/pipeline - create and auto-run pipeline
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, topic, metadata } = body;

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

    // 自动推进全流程（LLM 生成 + 微信推送）
    const wechatResult = await autoRunPipeline(run.id, topic);

    const completedRun = getPipelineRun(run.id);
    return NextResponse.json({
      success: true,
      data: completedRun,
      wechat: wechatResult,
      message: wechatResult?.media_id
        ? `Pipeline completed, WeChat draft published`
        : wechatResult?.error
          ? `Pipeline completed, WeChat failed: ${wechatResult.error}`
          : 'Pipeline auto-completed',
      timestamp: Date.now(),
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 400 });
  }
}