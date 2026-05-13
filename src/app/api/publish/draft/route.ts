import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, publishDraft } from '@/lib/services/wechat';
import { PublishDraftSchema } from '@/lib/validation/schemas';
import { getPipelineRun } from '@/lib/db';
import { listContentPieces } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = PublishDraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message || 'Invalid input' }, { status: 400 });
    }
    const { pipeline_id, title, content, digest, thumb_url } = parsed.data;

    if (!content && !pipeline_id) {
      return NextResponse.json({ success: false, error: 'content or pipeline_id required' }, { status: 400 });
    }

    if (pipeline_id) {
      const run = getPipelineRun(pipeline_id);
      if (!run) return NextResponse.json({ success: false, error: 'Pipeline not found' }, { status: 404 });
      const pieces = listContentPieces({ pipeline_id });
      const publishPiece = pieces.find(p => p.stage === 'publish') || pieces[pieces.length - 1];
      if (!publishPiece) return NextResponse.json({ success: false, error: 'No content to publish' }, { status: 400 });

      return doPublish({
        title: run.title,
        content: publishPiece.content,
        digest: publishPiece.content?.slice(0, 120) || digest,
      });
    }

    if (!content) return NextResponse.json({ success: false, error: 'content required when no pipeline_id' }, { status: 400 });
    return doPublish({ title: title || 'Untitled', content, digest });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function doPublish(input: { title: string; content: string; digest?: string }) {
  const articles = [{
    title: input.title,
    content: input.content,
    digest: input.digest || input.content.slice(0, 120).replace(/<[^>]+>/g, ''),
    need_open_comment: 0,
    content_source_url: '',
  }];
  // publishDraft now auto-fetches thumb_media_id from material library
  const result = await publishDraft(articles);
  return NextResponse.json({
    success: true,
    data: { media_id: result.media_id, title: input.title },
    message: 'Draft published to WeChat Official Account',
    timestamp: Date.now(),
  });
}

export async function GET() {
  try {
    const token = await getAccessToken();
    return NextResponse.json({ success: true, data: { token_length: token.length, masked: token.slice(0, 8) + '***' } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}