import { NextRequest, NextResponse } from 'next/server';
import { getMemoryService } from '@/lib/services/memory';

// GET /api/memory/search?q=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const results = await getMemoryService().search(query);
    return NextResponse.json({ success: true, data: results, timestamp: Date.now() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 500 });
  }
}