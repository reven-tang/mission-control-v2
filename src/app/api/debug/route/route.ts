import { NextRequest, NextResponse } from 'next/server';
import { initializeDefaultAgents, listOnlineAgents, findBestAgent } from '@/lib/services/agent-registry';
import { routeTask } from '@/lib/services/agent-router';
import { getDomainsForTags } from '@/lib/domains/capability-map';

export async function POST(request: NextRequest) {
  initializeDefaultAgents();
  
  const { title, tags } = await request.json();
  
  const domains = getDomainsForTags(tags);
  const bestAgent = findBestAgent(domains, tags);
  const allAgents = listOnlineAgents();
  
  console.log('[Debug] Tags:', tags);
  console.log('[Debug] Domains:', domains);
  console.log('[Debug] Best agent:', bestAgent);
  console.log('[Debug] All agents:', allAgents.map(a => a.agentId));
  
  const routeResult = await routeTask({
    id: 'test-' + Date.now(),
    title: title || 'test',
    tags: tags || [],
    complexity: 3
  });
  
  return NextResponse.json({
    domains,
    allAgents: allAgents.map(a => ({ id: a.agentId, domains: a.domains })),
    bestAgent,
    routeResult
  });
}
