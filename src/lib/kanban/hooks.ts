/**
 * Kanban Hooks
 * 看板钩子系统 — 集成任务分解与智能体路由
 */

import { decomposeComplexTask, needsDecomposition, SubTask } from '@/lib/task-decomposer';
import { routeTask } from '@/lib/services/agent-router';
import { initializeDefaultAgents } from '@/lib/services/agent-registry';
import { initializeSelfHealing, healError, executeHealing } from '@/lib/services/self-healing';
import { createTask as dbCreateTask, updateTask as dbUpdateTask } from '@/lib/db';
import type { TaskPriority, TaskSource } from '@/lib/types';

// 看板任务接口
export interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  priority: TaskPriority;
  source?: TaskSource;
  goal_id?: string;
  complexity?: number;
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'needs-human';
  children?: SubTask[];
  assignedAgentId?: string;
  sessionKey?: string;
}

// 钩子注册表
type HookType = 'beforeCreate' | 'afterCreate' | 'beforeUpdate' | 'afterUpdate' | 'onError';
const hooks: Map<HookType, Function[]> = new Map();

export function registerHook(type: HookType, handler: Function): void {
  if (!hooks.has(type)) hooks.set(type, []);
  hooks.get(type)!.push(handler);
}

async function executeHooks(type: HookType, context: any): Promise<any> {
  const handlers = hooks.get(type) || [];
  let result = context;
  for (const handler of handlers) {
    result = await handler(result);
  }
  return result;
}

// 初始化看板系统
export function initializeKanban(): void {
  console.log('[Kanban] Initializing hooks...');

  initializeDefaultAgents();
  initializeSelfHealing();

  // beforeCreate: 自动分解复杂任务
  registerHook('beforeCreate', async (task: KanbanTask) => {
    if (needsDecomposition(task.tags, task.complexity)) {
      console.log(`[Kanban] Decomposing: ${task.title}`);
      try {
        const result = await decomposeComplexTask(
          task.title,
          task.description || '',
          task.tags
        );
        task.children = result.cards;
        task.tags.push('decomposed');
      } catch (e) {
        console.warn('[Kanban] Decomposition failed:', (e as Error).message);
        task.tags.push('decompose-failed');
      }
    }
    return task;
  });

  // afterCreate: 自动路由到智能体 + 持久化扩展字段
  registerHook('afterCreate', async (task: KanbanTask) => {
    if (task.tags.includes('auto-assign')) {
      console.log(`[Kanban] Auto-assigning: ${task.title}`);
      try {
        const result = await routeTask({
          id: task.id,
          title: task.title,
          description: task.description,
          tags: task.tags,
          complexity: task.complexity
        });

        if (result.success) {
          task.assignedAgentId = result.agentId;
          task.sessionKey = result.sessionKey;
          task.status = 'in_progress';
        } else {
          task.status = 'backlog';
          task.tags.push('route-failed');
        }
      } catch (e) {
        console.error('[Kanban] Routing failed:', (e as Error).message);
        task.tags.push('route-error');
      }
    }

    // 持久化扩展字段（children, assignedAgentId, status 等）
    try {
      await dbUpdateTask(task.id, {
        status: task.status,
        tags: task.tags,
        assigned_agent: task.assignedAgentId,
      } as any);
      console.log('[Kanban] Extended fields saved:', task.id);
    } catch (e) {
      console.warn('[Kanban] Failed to save extended fields:', (e as Error).message);
    }

    return task;
  });

  // onError: 自愈处理
  registerHook('onError', async (context: { task: KanbanTask; error: Error; retryCount: number }) => {
    const { task, error, retryCount } = context;

    const healingResult = await healError({
      taskId: task.id,
      agentId: task.assignedAgentId || 'unknown',
      error,
      retryCount,
      timestamp: Date.now()
    });

    const healed = await executeHealing(task, healingResult);

    if (!healed && healingResult.action === 'escalate') {
      task.status = 'needs-human';
      task.tags.push('escalated');
    }

    return { task, healed, action: healingResult.action };
  });

  console.log('[Kanban] Hooks registered successfully');
}

// 创建任务（带钩子 + 持久化）
export async function createTask(taskData: Omit<KanbanTask, 'id' | 'status'>): Promise<KanbanTask> {
  const task: KanbanTask = {
    ...taskData,
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: 'backlog'
  };

  // beforeCreate 钩子（含任务分解）
  const processedTask = await executeHooks('beforeCreate', task);

  // 持久化基础字段到数据库
  const savedTask = dbCreateTask({
    title: processedTask.title,
    description: processedTask.description,
    priority: processedTask.priority,
    source: processedTask.source || 'manual',
    tags: processedTask.tags,
    goal_id: processedTask.goal_id,
  }) as KanbanTask;

  // afterCreate 钩子（含智能体路由 + 持久化扩展字段）
  const finalTask = await executeHooks('afterCreate', {
    ...savedTask,
    ...processedTask,
  });

  return finalTask;
}

// 更新任务状态
export async function updateTask(taskId: string, updates: Partial<KanbanTask>): Promise<KanbanTask | null> {
  await executeHooks('beforeUpdate', { taskId, updates });

  try {
    const updated = dbUpdateTask(taskId, updates as any);
    console.log('[Kanban] Task updated:', taskId);
    const result = await executeHooks('afterUpdate', { taskId, updates, task: updated });
    return result.task || null;
  } catch (e) {
    console.error('[Kanban] Update failed:', e);
    return null;
  }
}

// 处理任务错误
export async function handleTaskError(task: KanbanTask, error: Error, retryCount: number = 0): Promise<{
  task: KanbanTask;
  healed: boolean;
  action: string;
}> {
  return executeHooks('onError', { task, error, retryCount }) as Promise<any>;
}

// 导出
export { decomposeComplexTask, needsDecomposition } from '@/lib/task-decomposer';
export { routeTask } from '@/lib/services/agent-router';
export { initializeDefaultAgents, getAgent, listOnlineAgents } from '@/lib/services/agent-registry';
export { healError, classifyError } from '@/lib/services/self-healing';
