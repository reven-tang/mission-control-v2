import type { AgentSession } from '@/lib/types';

let instance: AgentService | null = null;

export function getAgentService(): AgentService {
  if (!instance) instance = new AgentService();
  return instance;
}

export class AgentService {
  private cache: AgentSession[] = [];
  private lastFetch: number = 0;
  private readonly CACHE_TTL = 30000; // 30s cache

  async getAgents(): Promise<AgentSession[]> {
    // Use cache if fresh
    if (this.cache.length > 0 && Date.now() - this.lastFetch < this.CACHE_TTL) {
      return this.cache;
    }

    try {
      // Try OpenClaw Gateway on its real port (not this app's port)
      const gatewayPort = process.env.OPENCLAW_PORT || '3578';
      const res = await fetch(`http://localhost:${gatewayPort}/api/agents`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        this.cache = data.agents || data.data || [];
        this.lastFetch = Date.now();
        return this.cache;
      }
    } catch {
      // Gateway not available, use process scan
    }

    return this.scanProcessAgents();
  }

  async getSessions(): Promise<any[]> {
    try {
      const gatewayPort = process.env.OPENCLAW_PORT || '3578';
      const res = await fetch(`http://localhost:${gatewayPort}/api/sessions`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return await res.json();
    } catch {}
    return [];
  }

  private scanProcessAgents(): AgentSession[] {
    const agents: AgentSession[] = [
      { id: 'planner', name: 'Planner', status: 'idle' },
      { id: 'builder', name: 'Builder', status: 'idle' },
      { id: 'reviewer', name: 'Reviewer', status: 'idle' },
    ];
    try {
      const { execSync } = require('child_process');
      const out = execSync('ps aux | grep -i openclaw | grep -v grep', { encoding: 'utf-8', timeout: 3000 }) || '';
      if (out.trim()) {
        agents.push({ id: 'gateway', name: 'Gateway', status: 'running', task: 'OpenClaw daemon' });
      }
    } catch {}
    this.cache = agents;
    this.lastFetch = Date.now();
    return agents;
  }
}
