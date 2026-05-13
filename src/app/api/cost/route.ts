import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/db';
import type { CostEntry } from '@/lib/types';
import { ReportCostSchema } from '@/lib/validation/schemas';

// Cost entries persist in mc-store.json
export async function GET() {
  const store = getStore();
  const costs = (store.token_usage || []) as CostEntry[];
  const total = costs.reduce((sum, c) => sum + (c.cost_usd || 0), 0);
  const byAgent: Record<string, { cost: number; tokens: number; sessions: number }> = {};
  const byModel: Record<string, { cost: number; tokens: number }> = {};

  costs.forEach(c => {
    const agent = c.agent_name || 'unknown';
    const model = c.model || 'unknown';
    if (!byAgent[agent]) byAgent[agent] = { cost: 0, tokens: 0, sessions: 0 };
    if (!byModel[model]) byModel[model] = { cost: 0, tokens: 0 };
    byAgent[agent].cost += c.cost_usd || 0;
    byAgent[agent].tokens += c.total_tokens || 0;
    byAgent[agent].sessions += 1;
    byModel[model].cost += c.cost_usd || 0;
    byModel[model].tokens += c.total_tokens || 0;
  });

  return NextResponse.json({
    success: true,
    data: { total, byAgent, byModel, recent: costs.slice(-10) },
    timestamp: Date.now(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ReportCostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message || 'Invalid input', timestamp: Date.now() }, { status: 400 });
    }
    const d = parsed.data;

    if (!getStore().token_usage) (getStore() as any).token_usage = [];

    const entry: CostEntry = {
      id: `cost_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      session_id: d.session_id || 'unknown',
      agent_name: d.agent_name || 'unknown',
      model: d.model || 'unknown',
      provider: d.provider || 'unknown',
      input_tokens: d.input_tokens || 0,
      output_tokens: d.output_tokens || 0,
      total_tokens: d.total_tokens || (d.input_tokens || 0) + (d.output_tokens || 0),
      cost_usd: d.cost_usd || 0,
      created_at: Date.now(),
    };

    (getStore() as any).token_usage.push(entry);

    return NextResponse.json({ success: true, data: entry, timestamp: Date.now() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 500 });
  }
}
