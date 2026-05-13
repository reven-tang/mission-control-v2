import { NextRequest, NextResponse } from 'next/server';
import { execSync, spawnSync } from 'child_process';

const OPENCLAW_PATH = '/Users/jhwu/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin';

/** Validate cron job id: only allow UUID / alphanumeric / dashes */
function isValidJobId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,100}$/.test(id);
}

/** Safe run of openclaw CLI via spawnSync (no shell injection) */
function runOpenClaw(args: string[]): { stdout: string; stderr: string; status: number } {
  const res = spawnSync('/Users/jhwu/.local/bin/openclaw', args, {
    encoding: 'utf-8',
    timeout: 120000,
    env: { ...process.env, PATH: OPENCLAW_PATH },
    shell: false,
  });
  return { stdout: res.stdout || '', stderr: res.stderr || '', status: res.status ?? 1 };
}

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
    if (!jobId || !isValidJobId(jobId)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    const { stdout, status } = runOpenClaw(['cron', 'delete', jobId]);
    if (status !== 0) {
      return NextResponse.json({ success: false, error: `Delete failed (exit ${status}): ${stdout.slice(0, 200)}` }, { status: 500 });
    }

    let parsed: { ok: boolean } = { ok: false };
    try { parsed = JSON.parse(stdout); } catch {}
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
    if (!jobId || !isValidJobId(jobId)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    const { stdout, status } = runOpenClaw(['cron', 'run', jobId]);
    if (status !== 0) {
      return NextResponse.json({ success: false, error: `Run failed (exit ${status}): ${stdout.slice(0, 200)}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, content: stdout, timestamp: Date.now() });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message, timestamp: Date.now() }, { status: 500 });
  }
}
