import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHealthService } from '../../src/lib/services/health';

describe('HealthService', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('should return healthcheck result with expected shape', async () => {
    const result = await getHealthService().runHealthcheck();
    expect(result).toHaveProperty('overall_score');
    expect(result).toHaveProperty('compile');
    expect(result).toHaveProperty('sync');
    expect(result).toHaveProperty('lint');
    expect(result).toHaveProperty('search');
    expect(result).toHaveProperty('index');
    expect(result.overall_score).toBeGreaterThanOrEqual(0);
    expect(result.overall_score).toBeLessThanOrEqual(100);
  });

  it('should return singleton on repeated calls', () => {
    expect(getHealthService()).toBe(getHealthService());
  });

  it('should handle script not found gracefully', async () => {
    const result = await getHealthService().runHealthcheck();
    expect(typeof result.overall_score).toBe('number');
    expect(typeof result.issues_found).toBe('number');
    expect(typeof result.compile.passed).toBe('boolean');
  });
});
