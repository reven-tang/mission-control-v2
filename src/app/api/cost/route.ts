import { NextResponse } from 'next/server';

const costStore: Map<string, any> = new Map();

export async function GET() {
  const costs = Array.from(costStore.values());
  const total = costs.reduce((sum, c) => sum + (c.cost || 0), 0);
  const byAgent: Record<string, number> = {};
  const byModel: Record<string, number> = {};
  
  costs.forEach(c => {
    const agent = c.agent || 'unknown';
    const model = c.model || 'unknown';
    byAgent[agent] = (byAgent[agent] || 0) + (c.cost || 0);
    byModel[model] = (byModel[model] || 0) + (c.cost || 0);
  });
  
  return NextResponse.json({
    success: true,
    data: { total, byAgent, byModel, recent: costs.slice(-10) },
    timestamp: Date.now(),
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { sessionId, agent, model, inputTokens, outputTokens, cost } = body;
  
  const entry = {
    id: `cost_${Date.now()}`,
    sessionId,
    agent,
    model,
    inputTokens: inputTokens || 0,
    outputTokens: outputTokens || 0,
    totalTokens: (inputTokens || 0) + (outputTokens || 0),
    cost: cost || 0,
    createdAt: Date.now(),
  };
  
  costStore.set(entry.id, entry);
  
  return NextResponse.json({ success: true, data: entry, timestamp: Date.now() });
}
