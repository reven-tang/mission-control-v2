import { NextRequest, NextResponse } from 'next/server';
import { getPipelineRun, updatePipelineRun, addContentPiece, listContentPieces } from '@/lib/db';
import type { PipelineStage } from '@/lib/types';

const STAGE_ORDER: PipelineStage[] = ['research', 'script', 'visual', 'video', 'publish'];

// 根据阶段和主题自动生成内容
function generateStageContent(stage: PipelineStage, topic: string, existingPieces: any[]): string {
  // 如果有 script 阶段的内容，后续阶段可以引用
  const scriptPiece = existingPieces.find(p => p.stage === 'script');
  const scriptContent = scriptPiece?.content || '';

  switch (stage) {
    case 'research':
      return `<h3>🔍 Research: ${topic}</h3>
<p>基于主题 "${topic}" 的研究分析：</p>
<ul>
<li>热点趋势追踪</li>
<li>用户痛点分析</li>
<li>竞品内容调研</li>
</ul>
<p><em>Research 阶段由 Quill Agent 自动完成研究。</em></p>`;

    case 'script':
      return `<h2>${topic}</h2>
<h3>一、背景</h3>
<p>当前社会与技术环境中，"${topic}" 成为关注焦点。本文从多维度深入分析这一议题。</p>
<h3>二、核心观点</h3>
<p>从研究数据中提炼以下关键发现，帮助读者全面理解这一主题的深层含义。</p>
<h3>三、解决方案</h3>
<p>针对"${topic}"，提出系统性应对方案，涵盖技术、政策和社会层面。</p>
<h3>四、展望</h3>
<p>未来发展趋势与行动建议，为读者提供前瞻性参考。</p>
<p style="text-align:center;"><em>—— Powered by Mission Control v2</em></p>`;

    case 'visual':
      return `<h3>🎨 Visual 配图方案</h3>
<p>为"${topic}"生成以下视觉素材：</p>
<ul>
<li><strong>封面图</strong>: 与主题高度契合的视觉冲击图</li>
<li><strong>正文配图</strong>: 每个章节的辅助插图</li>
<li><strong>Banner</strong>: 适合公众号横幅展示</li>
</ul>
<p><em>Visual 阶段由 Pixel Agent 自动生成配图方案。</em></p>`;

    case 'video':
      return `<h3>🎬 Video 视频准备</h3>
<p>为"${topic}"准备小红书 9:16 视频内容：</p>
<ul>
<li><strong>封面标题</strong>: ${topic}</li>
<li><strong>章节化文案</strong>: 将原文案改编为 3 个章节</li>
<li><strong>数据亮点</strong>: 提炼 3 个核心数据</li>
<li><strong>渲染</strong>: HyperFrames 生成 1080×1920 MP4</li>
</ul>
<p><em>Video 阶段将原文案改编为适合视频展示的形式，通过 HyperFrames 渲染输出。</em></p>`;

    case 'publish':
      // publish 阶段使用 script 的内容（即最终发布内容）
      if (scriptContent) {
        return scriptContent;
      }
      return `<h2>${topic}</h2>
<p>本文已通过 Pipeline 全流程自动产出，从 Research → Script → Visual → Publish 完整贯通。</p>
<p style="text-align:center;"><em>—— Powered by Mission Control v2</em></p>`;

    default:
      return '';
  }
}

// POST /api/pipeline/[id]/stage - advance to next stage
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const run = getPipelineRun(id);
    if (!run) return NextResponse.json({ success: false, error: 'Pipeline not found' }, { status: 404 });
    
    const body = await request.json();
    const { action, data } = body as { action: 'advance' | 'set'; data?: any };
    
    if (action === 'set' && data?.stage) {
      updatePipelineRun(id, { current_stage: data.stage, status: 'running', updated_at: Date.now() });
      return NextResponse.json({ success: true, data: getPipelineRun(id), timestamp: Date.now() });
    }
    
    // Auto advance
    const currentIdx = STAGE_ORDER.indexOf(run.current_stage);
    if (currentIdx === -1 || currentIdx >= STAGE_ORDER.length - 1) {
      // Complete pipeline
      updatePipelineRun(id, { status: 'completed', completed_at: Date.now(), updated_at: Date.now() });
      return NextResponse.json({ success: true, data: getPipelineRun(id), message: 'Pipeline completed', timestamp: Date.now() });
    }
    
    const nextStage = STAGE_ORDER[currentIdx + 1];
    updatePipelineRun(id, { current_stage: nextStage, status: 'running', updated_at: Date.now() });
    
    // 获取已有 pieces 用于后续阶段引用
    const existingPieces = listContentPieces({ pipeline_id: id });
    
    // 自动生成内容（如果前端没传 content）
    const content = data?.content || generateStageContent(nextStage, run.title, existingPieces);
    
    // Create content piece for this stage
    addContentPiece({
      pipeline_id: id,
      stage: nextStage,
      title: run.title,
      content,
      assets: data?.assets || {},
      status: 'draft',
    });
    
    return NextResponse.json({ success: true, data: getPipelineRun(id), timestamp: Date.now() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 500 });
  }
}