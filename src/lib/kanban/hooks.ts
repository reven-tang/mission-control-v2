/**
 * Kanban Hooks
 * 看板钩子系统 — 集成任务分解与智能体路由
 */

import { decomposeComplexTask, needsDecomposition, SubTask } from '@/lib/task-decomposer';
import { routeTask } from '@/lib/services/agent-router';
import { initializeDefaultAgents } from '@/lib/services/agent-registry';
import { initializeSelfHealing, healError, executeHealing } from '@/lib/services/self-healing';

// 看板任务接口
interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  complexity?: number;
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'needs-human';
  children?: SubTask[];
  assignedAgentId?: string;
  sessionKey?: string;
}

// 钩子注册表
type HookType = 'beforeCreate' | 'afterCreate' | 'beforeUpdate' | 'afterUpdate' | 'onError';
const hooks: Map<HookType, Function[]> = new Map();

/**
 * 注册钩子
 */
export function registerHook(type: HookType, handler: Function): void {
  if (!hooks.has(type)) hooks.set(type, []);
  hooks.get(type)!.push(handler);
}

/**
 * 执行钩子
 */
async function executeHooks(type: HookType, context: any): Promise<any> {
  const handlers = hooks.get(type) || [];
  let result = context;
  for (const handler of handlers) {
    result = await handler(result);
  }
  return result;
}

/**
 * 初始化看板系统
 */
export function initializeKanban(): void {
  console.log('[Kanban] Initializing hooks...');
  
  // 初始化智能体
  initializeDefaultAgents();
  
  // 初始化自愈系统
  initializeSelfHealing();
  
  // 注册 beforeCreate 钩子：自动分解复杂任务
  registerHook('beforeCreate', async (task: KanbanTask) => {
    if (needsDecomposition(task.tags, task.complexity)) {
      console.log(`[Kanban] Decomposing complex task: ${task.title}`);
      try {
        const result = await decomposeComplexTask(
          task.title,
          task.description,
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
  
  // 注册 afterCreate 钩子：自动路由到智能体
  registerHook('afterCreate', async (task: KanbanTask) => {
    if (task.tags.includes('auto-assign')) {
      console.log(`[Kanban] Auto-assigning task: ${task.title}`);
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
    return task;
  });
  
  // 注册 onError 钩子：自愈处理
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

/**
 * 创建任务（带钩子）
 */
export async function createTask(taskData: Omit<KanbanTask, 'id' | 'status'>): Promise<KanbanTask> {
  const task: KanbanTask = {
    ...taskData,
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: 'backlog'
  };
  
  // 执行 beforeCreate 钩子
  const processedTask = await executeHooks('beforeCreate', task);
  
  // 保存到数据库（这里简化处理）
  console.log('[Kanban] Task created:', processedTask.id);
  
  // 执行 afterCreate 钩子
  const finalTask = await executeHooks('afterCreate', processedTask);
  
  return finalTask;
}

/**
 * 更新任务状态（带钩子）
 */
export async function updateTask(taskId: string, updates: Partial<KanbanTask>): Promise<KanbanTask | null> {
  // 执行 beforeUpdate 钩子
  const context = await executeHooks('beforeUpdate', { taskId, updates });
  
  // 更新数据库（简化）
  console.log('[Kanban] Task updated:', taskId, updates);
  
  // 执行 afterUpdate 钩子
  const result = await executeHooks('afterUpdate', context);
  
  return result.task || null;
}

/**
 * 处理任务错误
 */
export async function handleTaskError(task: KanbanTask, error: Error, retryCount: number = 0): Promise<{
  task: KanbanTask;
  healed: boolean;
  action: string;
}> {
  return executeHooks('onError', { task, error, retryCount }) as Promise<any>;
}

// 导出便捷函数
export { decomposeComplexTask, needsDecomposition } from '@/lib/task-decomposer';
export { routeTask } from '@/lib/services/agent-router';
export { initializeDefaultAgents, getAgent, listOnlineAgents } from '@/lib/services/agent-registry';
export { healError, classifyError } from '@/lib/services/self-healing';