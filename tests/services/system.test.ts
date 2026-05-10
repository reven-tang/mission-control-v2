import { describe, it, expect } from 'vitest';
import { getSystemService } from '../../src/lib/services/system';

describe('SystemService', () => {
  it('should return system stats with all fields', async () => {
    const stats = await getSystemService().getStats();
    expect(stats).toBeDefined();
    expect(typeof stats.cpu_usage).toBe('number');
    expect(typeof stats.memory_usage).toBe('number');
    expect(typeof stats.disk_usage).toBe('number');
    expect(typeof stats.uptime).toBe('number');
    expect(stats.cpu_usage).toBeGreaterThanOrEqual(0);
    expect(stats.cpu_usage).toBeLessThanOrEqual(100);
    expect(stats.memory_usage).toBeGreaterThanOrEqual(0);
  });

  it('should have reasonable uptime', async () => {
    const stats = await getSystemService().getStats();
    expect(stats.uptime).toBeGreaterThanOrEqual(0);
  });
});
