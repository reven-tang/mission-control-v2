import { createTask, getKanban, getStore, updateTask, deleteTask, getTask, listTasks } from '@/lib/db';
import type { Task } from '@/lib/types';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

let instance: TaskService | null = null;

export function getTaskService(): TaskService {
  if (!instance) instance = new TaskService();
  return instance;
}

function loadAutonomousBacklog(): any[] {
  try {
    const path = join(process.cwd(), 'AUTONOMOUS.md');
    if (!existsSync(path)) return [];
    const content = readFileSync(path, 'utf-8');
    const m = content.match(/^---\n([\s\S]*?)\n---/);
    if (!m) return [];
    const fm = m[1];
    const blocks = fm.split(/\n(?=  - id:)/);
    const items: any[] = [];
    for (const b of blocks) {
      const id = (b.match(/id:\s*(\S+)/) || [])[1];
      const title = (b.match(/title:\s*"?([^"\n]+)"?/) || [])[1]?.trim() || '';
      const desc = (b.match(/description:\s*"?([^"\n]+)"?/) || [])[1]?.trim() || '';
      const prio = parseInt((b.match(/priority:\s*(\d+)/) || [])[1] || '2');
      const tagsStr = (b.match(/tags:\s*\[([^\]]*)\]/) || [])[1] || '';
      const tags = tagsStr.split(',').map((t: string) => t.trim()).filter(Boolean);
      if (id && title) items.push({ id, title, description: desc, priority: prio, tags, done: false });
    }
    return items;
  } catch { return []; }
}

export class TaskService {
  async create(input: any): Promise<Task> { return createTask(input); }
  async update(id: string, changes: Partial<Task>): Promise<Task> { return updateTask(id, changes); }
  async move(id: string, newStatus: any): Promise<Task> { return updateTask(id, { status: newStatus }); }
  async delete(id: string): Promise<void> { deleteTask(id); }
  async getById(id: string): Promise<Task | null> { return getTask(id); }
  async list(filters?: { status?: string; priority?: number }): Promise<Task[]> { return listTasks(filters); }
  async getKanban() { return getKanban(); }

  async promoteHighPriorityToTodo(): Promise<Task[]> {
    // Promote P3+ tasks from backlog to todo
    const backlog = listTasks({ status: 'backlog' });
    const toPromote = backlog.filter(t => (t.priority ?? 0) >= 3);
    const promoted: Task[] = [];
    
    for (const task of toPromote) {
      updateTask(task.id, { status: 'todo', updated_at: Date.now() });
      promoted.push(getTask(task.id)!);
    }
    
    return promoted;
  }


  async generateDailyTasks(): Promise<Task[]> {
    const backlog = loadAutonomousBacklog();
    const created: Task[] = [];
    const candidates = backlog.filter(b => !b.done).slice(0, 5);
    for (const item of candidates) {
      const existing = listTasks().find((t: Task) =>
        t.title.includes(item.title) && t.created_at > Date.now() - 86400000
      );
      if (existing) continue;
      const task = createTask({
        title: item.title,
        description: item.description,
        priority: item.priority || 2,
        tags: item.tags || ['auto-generated'],
        source: 'autonomous',
        goal_id: item.id,
      });
      created.push(task);
    }
    return created;
  }
}
