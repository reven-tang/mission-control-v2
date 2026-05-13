// POST /api/pipeline/[id]/publish - 手动重新推送到微信公众号
import { NextRequest, NextResponse } from 'next/server';
import { getPipelineRun, updatePipelineRun, addContentPiece, listContentPieces } from '@/lib/db';
import { publishDraft } from '@/lib/services/wechat';
import { getThumbMediaIdForTopic } from '@/lib/services/stock-image';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const runId = params.id;
    const run = getPipelineRun(runId);
    if (!run) {
      return NextResponse.json({ success: false, error: 'Pipeline not found' }, { status: 404 });
    }

    // 找最新版 script 内容
    const pieces = listContentPieces({ pipeline_id: runId });
    const scriptPieces = pieces.filter(p => p.stage === 'script');
    if (!scriptPieces.length) {
      return NextResponse.json({ success: false, error: 'No script content found' }, { status: 400 });
    }
    const content = scriptPieces[scriptPieces.length - 1].content;

    // 获取封面图（优先找已有的 visual piece）
    let thumbMediaId = '';
    const visualPieces = pieces.filter(p => p.stage === 'visual' && p.assets?.thumb_media_id);
    if (visualPieces.length) {
      thumbMediaId = visualPieces[visualPieces.length - 1].assets!.thumb_media_id!;
    } else {
      // 重新搜索上传
      try {
        thumbMediaId = await getThumbMediaIdForTopic(run.topic);
      } catch (e) { /* 忽略 */ }
    }

    // 推送到微信草稿箱
    const result = await publishDraft([{
      title: run.topic,
      content,
      thumb_media_id: thumbMediaId || undefined,
    }]);

    // 保存 publish piece
    addContentPiece({
      pipeline_id: runId,
      stage: 'publish',
      title: run.topic,
      content,
      assets: { wechat_media_id: result.media_id, thumb_media_id: thumbMediaId },
      status: 'published',
    });

    updatePipelineRun(runId, {
      current_stage: 'publish',
      status: 'completed',
      updated_at: Date.now(),
    });

    return NextResponse.json({
      success: true,
      data: { media_id: result.media_id, thumb_media_id: thumbMediaId },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}