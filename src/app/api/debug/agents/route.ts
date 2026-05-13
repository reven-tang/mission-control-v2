import { NextRequest, NextResponse } from 'next/server';
import { initializeDefaultAgents, listOnlineAgents, findBestAgent } from '@/lib/services/agent-registry';

export async function GET() {
  // 强制初始化
  initializeDefaultAgents();
  
  const agents = listOnlineAgents();
  const bestAgent = findBestAgent(['research'], ['市场分析']);
  
  return NextResponse.json({
    agentsCount: agents.length,
    agents: agents.map(a => ({ id: a.agentId, domains: a.domains, skills: a.skills })),
    bestAgentForResearch: bestAgent
  });
}
