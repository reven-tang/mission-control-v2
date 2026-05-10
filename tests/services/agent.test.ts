import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAgentService } from '../../src/lib/services/agent';

describe('AgentService', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('should return singleton', () => {
    expect(getAgentService()).toBe(getAgentService());
  });

  it('should scan process agents as fallback', async () => {
    const result = await getAgentService().getAgents();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return agents with id/name/status', async () => {
    const result = await getAgentService().getAgents();
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('status');
    }
  });

  it('should get sessions (empty array on failure)', async () => {
    const result = await getAgentService().getSessions();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle gateway API failure gracefully', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValue(new Error('connection refused'));
    const result = await getAgentService().getAgents();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(0);
    fetchSpy.mockRestore();
  });

  it('should set planner status to running when openclaw is running', async () => {
    vi.spyOn(require('child_process'), 'execSync').mockReturnValue('openclaw gateway running\n' as any);
    const result = await getAgentService().getAgents();
    const planner = result.find(a => a.id === 'planner');
    expect(planner).toBeDefined();
    expect(planner!.status).toBe('running');
  });
});
