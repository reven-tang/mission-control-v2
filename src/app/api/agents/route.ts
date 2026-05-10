import { NextRequest, NextResponse } from 'next/server';
import { getAgentService } from '@/lib/services/agent';

export async function GET() {
  try {
    const agents = await getAgentService().getAgents();
    return NextResponse.json({ success: true, data: agents, timestamp: Date.now() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 500 });
  }
}