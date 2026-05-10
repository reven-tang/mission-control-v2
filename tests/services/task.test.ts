import { describe, it, expect, beforeEach } from 'vitest';
import { getTaskService } from '../../src/lib/services/task';
import { getStore } from '../../src/lib/db';

describe('TaskService (service layer)', () => {
  beforeEach(() => {
    getStore().tasks = [];
  });

  it('should create task via service', async () => {
    const task = await getTaskService().create({ title: 'Service Test', priority: 1 });
    expect(task).toBeDefined();
    expect(task.title).toBe('Service Test');
    expect(task.id).toBeTruthy();
  });

  it('should get task by id via service', async () => {
    const created = await getTaskService().create({ title: 'Find Via Service' });
    const found = await getTaskService().getById(created.id);
    expect(found).toBeDefined();
    expect(found!.title).toBe('Find Via Service');
  });

  it('should update task via service', async () => {
    const created = await getTaskService().create({ title: 'Before Update' });
    const updated = await getTaskService().update(created.id, { title: 'After Update' });
    expect(updated.title).toBe('After Update');
  });

  it('should move task status via service', async () => {
    const created = await getTaskService().create({ title: 'Move Service' });
    const moved = await getTaskService().move(created.id, 'done');
    expect(moved.status).toBe('done');
    expect(moved.completed_at).toBeGreaterThan(0);
  });

  it('should list tasks via service', async () => {
    await getTaskService().create({ title: 'List 1' });
    await getTaskService().create({ title: 'List 2' });
    const tasks = await getTaskService().list();
    expect(tasks.length).toBeGreaterThanOrEqual(2);
  });

  it('should return kanban via service', async () => {
    await getTaskService().create({ title: 'KB1' });
    const k = await getTaskService().getKanban();
    expect(Object.keys(k)).toEqual(['backlog','todo','in_progress','review','done']);
    expect(k.backlog!.length).toBeGreaterThanOrEqual(1);
  });

  it('should return singleton instance', () => {
    const s1 = getTaskService();
    const s2 = getTaskService();
    expect(s1).toBe(s2);
  });
});
