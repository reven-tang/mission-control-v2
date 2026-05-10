import { NextRequest, NextResponse } from 'next/server';
import { getSystemService } from '@/lib/services/system';

export async function GET() {
  try {
    const stats = await getSystemService().getStats();
    return NextResponse.json({ success: true, data: stats, timestamp: Date.now() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 500 });
  }
}