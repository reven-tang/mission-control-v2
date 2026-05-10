import { describe, it, expect } from 'vitest';
import { getMemoryService } from '../../src/lib/services/memory';

describe('MemoryService', () => {
  it('should scan memory directory and return results', async () => {
    const service = getMemoryService();
    const results = await service.scan();
    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('title');
      expect(results[0]).toHaveProperty('content');
    }
  });

  it('should search memory by query', async () => {
    const results = await getMemoryService().search('Mission');
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeLessThanOrEqual(20);
  });

  it('should return recent memories', async () => {
    const results = await getMemoryService().recent(5);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('should handle empty search gracefully', async () => {
    const results = await getMemoryService().search('zzznonexistentquery12345');
    expect(Array.isArray(results)).toBe(true);
  });
});
