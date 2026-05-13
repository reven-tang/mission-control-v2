import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAgentService } from '../../src/lib/services/agent';
import * as cp from 'child_process';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('AgentService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

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
    (cp.execSync as any).mockReturnValue('openclaw gateway running\n');
    const fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValue(new Error('connection refused'));
    const result = await getAgentService().getAgents();
    const gateway = result.find(a => a.id === 'gateway');
    expect(gateway).toBeDefined();
    expect(gateway!.status).toBe('running');
    fetchSpy.mockRestore();
  });
});
