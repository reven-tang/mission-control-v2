import { NextRequest, NextResponse } from 'next/server';
import { getMemoryService } from '@/lib/services/memory';

// GET /api/memory/recent
export async function GET() {
  try {
    const results = await getMemoryService().recent(10);
    return NextResponse.json({ success: true, data: results, timestamp: Date.now() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 500 });
  }
}