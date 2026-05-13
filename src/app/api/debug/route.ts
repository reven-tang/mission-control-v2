import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import os from 'os';
import { join } from 'path';

export async function GET() {
  const envKeys = ['SDJ_MODELSCOPE_API_KEY', 'SDW_MODELSCOPE_API_KEY', 'MODELSCOPE_API_KEY', 'SJZ_MODELSCOPE_API_KEY'];
  const env: Record<string, string> = {};
  for (const k of envKeys) env[k] = process.env[k] ? `${process.env[k].slice(0, 12)}...` : 'NOT SET';

  let envLocal: Record<string, string> = {};
  try {
    const p = join(process.cwd(), '.env.local');
    if (fs.existsSync(p)) {
      for (const line of fs.readFileSync(p, 'utf-8').split('\n')) {
        const m = line.match(/^([A-Z_]+)=(.+)/);
        if (m && envKeys.includes(m[1])) envLocal[m[1]] = `${m[2].slice(0, 12)}...`;
      }
    }
  } catch { /* */ }

  let resolved: Record<string, string> = {};
  try {
    const cfg = JSON.parse(fs.readFileSync(join(os.homedir(), '.openclaw/openclaw.json'), 'utf-8'));
    for (const [name, p] of Object.entries(cfg.models.providers) as [string, any][]) {
      if (!p?.apiKey) continue;
      let k = p.apiKey;
      if (k.startsWith('${') && k.endsWith('}')) {
        const ev = k.slice(2, -1);
        resolved[name] = process.env[ev] ? `${process.env[ev].slice(0,12)}...` : 'EMPTY';
      }
    }
  } catch { /* */ }

  return NextResponse.json({ env, envLocal, resolved });
}
