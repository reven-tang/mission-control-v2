/**
 * LLM Content Generation Service - Unit Tests
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('LLM Content Service', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SDJ_MODELSCOPE_API_KEY;
    delete process.env.SJZ_MODELSCOPE_API_KEY;
  });

  describe('Public API', () => {
    
    test('should export public functions', () => {
      const service = require('@/lib/services/llm-content');
      expect(service.generateArticle).toBeDefined();
      expect(service.humanizeArticle).toBeDefined();
      expect(service.generateVisualDescription).toBeDefined();
      expect(service.buildProviderMap).toBeDefined();
      expect(service.resolveProvider).toBeDefined();
    });

    test('generateArticle should be callable', () => {
      const { generateArticle } = require('@/lib/services/llm-content');
      expect(typeof generateArticle).toBe('function');
    });
  });

  describe('Provider Map Building', () => {
    
    test('buildProviderMap should return a Map', () => {
      const { buildProviderMap } = require('@/lib/services/llm-content');
      const map = buildProviderMap();
      expect(map).toBeInstanceOf(Map);
      expect(map.size).toBeGreaterThan(0);
    });

    test('resolveProvider handles model lookups', () => {
      const { resolveProvider } = require('@/lib/services/llm-content');
      const prov = resolveProvider('test-model');
      expect(prov === null || typeof prov === 'object').toBe(true);
    });
  });

  describe('loadOpenClawConfig', () => {
    test('should return object', () => {
      const { loadOpenClawConfig } = require('@/lib/services/llm-content');
      expect(typeof loadOpenClawConfig()).toBe('object');
    });
  });

  describe('generateArticle with mock', () => {
    test('should throw when all models exhaust', async () => {
      const { generateArticle } = require('@/lib/services/llm-content');
      mockFetch.mockRejectedValue(new Error('API Down'));
      
      await expect(generateArticle('Test')).rejects.toThrow('All models exhausted');
    });
  });

  describe('generateVisualDescription', () => {
    test('should generate visual HTML', async () => {
      const { generateVisualDescription } = require('@/lib/services/llm-content');
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'HTML visual description' } }],
        }),
      } as any);
      
      const result = await generateVisualDescription('Topic', 'Summary');
      expect(typeof result).toBe('string');
    });

    test('should return fallback on error', async () => {
      const { generateVisualDescription } = require('@/lib/services/llm-content');
      
      mockFetch.mockRejectedValue(new Error('Failed'));
      
      const result = await generateVisualDescription('Topic', 'Summary');
      expect(typeof result).toBe('string');
      expect(result).toContain('Topic');
    });
  });

  describe('humanizeArticle', () => {
    test('should humanize via API', async () => {
      const { humanizeArticle } = require('@/lib/services/llm-content');
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '<p>Humanized</p>' } }],
        }),
      } as any);
      
      const result = await humanizeArticle('<p>Raw</p>');
      expect(typeof result).toBe('string');
    });

    test('should return original when all models fail', async () => {
      const { humanizeArticle } = require('@/lib/services/llm-content');
      
      mockFetch.mockRejectedValue(new Error('Failed'));
      
      const result = await humanizeArticle('<p>Original</p>');
      expect(result).toBe('<p>Original</p>');
    });
  });
});