/**
 * Database Service - Unit Tests
 */

import { describe, test, expect, jest, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs';

describe('Database Service', () => {
  
  const testDbPath = './data/test-store.json';
  
  beforeAll(() => {
    // Ensure test directory exists
    if (!fs.existsSync('./data')) {
      fs.mkdirSync('./data');
    }
    
    // Initialize test database with empty state
    fs.writeFileSync(testDbPath, JSON.stringify({ tasks: [], pipelines: [] }, null, 2));
    
    // Set up process.env to use test path
    process.env.MC_STORE_PATH = testDbPath;
  });

  afterAll(() => {
    // Cleanup test database
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
      delete process.env.MC_STORE_PATH;
    } catch (e) {
      console.error('Cleanup failed:', e);
    }
  });

  describe('Task Operations', () => {
    
    test('should create a new task with proper ID format', async () => {
      const { createTask } = await import('@/lib/db');
      
      const task = createTask({
        title: 'Test Task',
        description: 'Test Description',
        priority: 3 as 0 | 1 | 2 | 3 | 4,
        source: 'test' as TaskSource,
      });
      
      expect(task.id).toMatch(/^task_\d{13}_[a-z0-9]{6}$/);
      expect(task.title).toBe('Test Task');
      expect(task.status).toBe('backlog');
      expect(task.created_at).toBeDefined();
      expect(task.updated_at).toBeDefined();
    });

    test('should update an existing task', async () => {
      const { createTask, updateTask } = await import('@/lib/db');
      
      const task = createTask({
        title: 'Original Title',
        priority: 1 as 0 | 1 | 2 | 3 | 4,
        source: 'test' as TaskSource,
      });
      
      const updated = updateTask(task.id, {
        title: 'Updated Title',
        status: 'in_progress' as any,
      });
      
      expect(updated.title).toBe('Updated Title');
      expect(updated.status).toBe('in_progress');
      expect(updated.updated_at).toBeGreaterThanOrEqual(task.updated_at);
    });

    test('should throw error when updating non-existent task', async () => {
      const { updateTask } = await import('@/lib/db');
      
      expect(() => {
        updateTask('non-existent-id', { title: 'Update' });
      }).toThrow(/not found/i);
    });

    test('should list tasks with optional filters', async () => {
      const { listTasks, createTask } = await import('@/lib/db');
      
      createTask({ title: 'High Priority Task', priority: 5 as any, source: 'test' as TaskSource });
      createTask({ title: 'Low Priority Task', priority: 1 as any, source: 'test' as TaskSource });
      
      const allTasks = listTasks();
      expect(allTasks.length).toBeGreaterThanOrEqual(2);
      
      const filtered = listTasks({ priority: 1 });
      expect(filtered.every(t => t.priority === 1)).toBe(true);
    });
  });

  describe('Pipeline Operations', () => {
    
    test('should create a new pipeline run', async () => {
      const { addPipelineRun, getPipelineRun } = await import('@/lib/db');
      
      const pipeline = addPipelineRun({
        title: 'Test Pipeline',
        topic: 'AI Trends 2026',
        current_stage: 'research',
        status: 'running',
      });
      
      expect(pipeline.id).toMatch(/^pipeline_\d{13}_[a-z0-9]{5}$/);
      expect(pipeline.current_stage).toBe('research');
      expect(pipeline.status).toBe('running');
      expect(pipeline.created_at).toBeDefined();
    });

    test('should update pipeline stage correctly', async () => {
      const { addPipelineRun, updatePipelineRun } = await import('@/lib/db');
      
      const pipeline = addPipelineRun({
        title: 'Stage Test',
        topic: 'Test',
        current_stage: 'research',
        status: 'running',
      });
      
      const updated = updatePipelineRun(pipeline.id, {
        current_stage: 'script',
        status: 'completed',
      });
      
      expect(updated.current_stage).toBe('script');
      expect(updated.status).toBe('completed');
    });

    test('should delete an existing task', async () => {
      const { createTask, deleteTask, listTasks } = await import('@/lib/db');
      
      const task = createTask({ title: 'To Delete', priority: 1 as any, source: 'test' as any });
      const tasksBefore = listTasks().length;
      
      const result = deleteTask(task.id);
      
      expect(result).toBe(true);
      expect(listTasks().length).toBe(tasksBefore - 1);
    });

    test('should return false when deleting non-existent task', async () => {
      const { deleteTask } = await import('@/lib/db');
      
      const result = deleteTask('non-existent-id');
      
      expect(result).toBe(false);
    });

    test('should get task by ID', async () => {
      const { createTask, getTask } = await import('@/lib/db');
      
      const task = createTask({ title: 'Get Test', priority: 2 as any, source: 'test' as any });
      const found = getTask(task.id);
      
      expect(found).toBeDefined();
      expect(found?.title).toBe('Get Test');
    });

    test('should return null for non-existent task ID', async () => {
      const { getTask } = await import('@/lib/db');
      
      const result = getTask('non-existent-id');
      
      expect(result).toBeNull();
    });
  });

  describe('Pain Points Operations', () => {
    
    test('should create a new pain point', async () => {
      const { addPainPoint, listPainPoints } = await import('@/lib/db');
      
      const before = listPainPoints().length;
      const pp = addPainPoint({ title: 'Test Pain', severity: 3, source: 'test' as any });
      
      expect(pp.id).toMatch(/^pp_/);
      expect(listPainPoints().length).toBe(before + 1);
    });

    test('should list pain points', async () => {
      const { listPainPoints } = await import('@/lib/db');
      
      const points = listPainPoints();
      expect(Array.isArray(points)).toBe(true);
    });

    test('should update a pain point', async () => {
      const { addPainPoint, updatePainPoint } = await import('@/lib/db');
      
      const pp = addPainPoint({ title: 'Original', severity: 1, source: 'test' as any });
      const updated = updatePainPoint(pp.id, { severity: 5 });
      
      expect(updated?.severity).toBe(5);
    });

    test('should delete a pain point', async () => {
      const { addPainPoint, deletePainPoint, listPainPoints } = await import('@/lib/db');
      
      const pp = addPainPoint({ title: 'To Delete', severity: 2, source: 'test' as any });
      const before = listPainPoints().length;
      
      const result = deletePainPoint(pp.id);
      
      expect(result).toBe(true);
      expect(listPainPoints().length).toBe(before - 1);
    });
  });

  describe('Opportunities Operations', () => {
    
    test('should create a new opportunity', async () => {
      const { addOpportunity, listOpportunities } = await import('@/lib/db');
      
      const before = listOpportunities().length;
      const opp = addOpportunity({ title: 'Test Opportunity', score: 85, status: 'identified' as any });
      
      expect(opp.id).toMatch(/^opp_/);
      expect(listOpportunities().length).toBe(before + 1);
    });

    test('should list opportunities', async () => {
      const { listOpportunities } = await import('@/lib/db');
      
      const opps = listOpportunities();
      expect(Array.isArray(opps)).toBe(true);
    });
  });

  describe('Concurrency Safety', () => {
    
    test('should handle concurrent updates atomically', async () => {
      const { createTask, listTasks, updateTaskAsync } = await import('@/lib/db');
      
      const task = createTask({
        title: 'Concurrency Test',
        priority: 3 as 0 | 1 | 2 | 3 | 4,
        source: 'test' as TaskSource,
      });
      
      // Simulate concurrent updates
      const [result1, result2] = await Promise.all([
        updateTaskAsync(task.id, { priority: 4 }),
        updateTaskAsync(task.id, { priority: 5 }),
      ]);
      
      // One of them should succeed, and we should have exactly one task
      const tasks = listTasks();
      const testTask = tasks.find(t => t.id === task.id);
      expect(testTask).toBeDefined();
      expect([4, 5]).toContain(testTask?.priority); // Should be one of the concurrent updates
    });
  });
});

// TypeScript type for tests
type TaskSource = 'manual' | 'api' | 'cron' | 'webhook';
