import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';

const OPENCLAW_PATH = '/Users/jhwu/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin';

// GET /api/cron — return real cron job status via CLI
export async function GET() {
  try {
    const out = execSync('openclaw cron list --json', { 
      encoding: 'utf-8', 
      timeout: 10000,
      env: { ...process.env, PATH: OPENCLAW_PATH },
    });
    const data = JSON.parse(out);
    
    const jobs = (data.jobs || []).map((j: any) => ({
      id: j.id,
      name: j.name || 'Unnamed',
      schedule: j.schedule?.expr || 'unknown',
      enabled: j.enabled !== false,
      last_run: j.lastRunAtMs ? new Date(j.lastRunAtMs).toLocaleString('zh-CN') : 'never',
      status: j.state?.nextRunAtMs ? 'ok' : 'idle',
      next_run: j.state?.nextRunAtMs ? new Date(j.state.nextRunAtMs).toLocaleString('zh-CN') : 'unknown',
    }));

    return NextResponse.json({ success: true, data: jobs, timestamp: Date.now() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message, timestamp: Date.now() }, { status: 500 });
  }
}



// DELETE /api/cron?id=xxx - delete a cron job
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('id');
    if (!jobId) {
      return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    }
    
    const result = execSync(`/Users/jhwu/.local/bin/openclaw cron delete ${jobId}`, { 
      encoding: 'utf-8', timeout: 10000 
    });
    const parsed = JSON.parse(result);
    
    return NextResponse.json({ success: parsed.ok, data: parsed, timestamp: Date.now() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 500 });
  }
}

// POST /api/cron — trigger a cron job by id via CLI
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('id');
    if (!jobId) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });

    const out = execSync(`openclaw cron run ${jobId}`, { 
      encoding: 'utf-8', 
      timeout: 120000,
      env: { ...process.env, PATH: OPENCLAW_PATH },
    });
    
    return NextResponse.json({ success: true, content: out, timestamp: Date.now() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message, timestamp: Date.now() }, { status: 500 });
  }
}
