import { NextRequest, NextResponse } from 'next/server';
import { getHealthService } from '@/lib/services/health';

export async function GET() {
  try {
    const result = await getHealthService().runHealthcheck();
    return NextResponse.json({ success: true, data: result, timestamp: Date.now() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 500 });
  }
}