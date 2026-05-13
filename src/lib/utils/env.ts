// Shared environment loader — used by services
import fs from 'fs';
import { join } from 'path';

let _cached: Record<string, string> | null = null;

export function loadEnv(): Record<string, string> {
  if (_cached) return _cached;
  const envPath = join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    _cached = fs.readFileSync(envPath, 'utf-8')
      .split('\n').filter(l => l && !l.startsWith('#'))
      .reduce((acc, line) => { const [k, ...v] = line.split('='); acc[k.trim()] = v.join('=').trim(); return acc; }, {} as Record<string, string>);
  } else {
    _cached = {};
  }
  return _cached;
}