import { NextRequest, NextResponse } from 'next/server';
import { generateVideo, type VideoData } from '@/lib/services/video/video-generator';

export const runtime = 'nodejs';

// POST /api/video - 生成视频
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data } = body as { data: VideoData };
    
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Missing data' },
        { status: 400 }
      );
    }
    
    // 生成视频
    const videoPath = await generateVideo({ data });
    
    return NextResponse.json({
      success: true,
      data: { videoPath },
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, timestamp: Date.now() },
      { status: 500 }
    );
  }
}

// GET /api/video - 健康检查
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Video API ready',
    timestamp: Date.now(),
  });
}
