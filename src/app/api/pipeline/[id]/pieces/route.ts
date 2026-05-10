import { NextRequest, NextResponse } from 'next/server';
import { listContentPieces } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pieces = listContentPieces({ pipeline_id: id });
  return NextResponse.json({ success: true, data: pieces, timestamp: Date.now() });
}
