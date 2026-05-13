/**
 * Agent Router
 * 智能体路由服务 — 基于能力域的动态任务分配
 */

import { CapabilityDomain, getDomainsForTags } from '@/lib/domains/capability-map';
import { findBestAgent, updateAgentStatus, getAgent } from './agent-registry';
// Note: sessions_spawn is available as a global tool in OpenClaw runtime

interface Task {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  complexity?: number;
  priority?: number;
}

interface RouteResult {
  success: boolean;
  agentId?: string;
  sessionKey?: string;
  error?: string;
}

/**
 * 为任务分配最佳智能体
 * @param task 任务对象
 * @returns 路由结果
 */
export async function routeTask(task: Task): Promise<RouteResult> {
  // 1. 提取能力域
  const domains = getDomainsForTags(task.tags);
  if (domains.length === 0) {
    console.warn(`[AgentRouter] No capability domains found for tags: ${task.tags.join(', ')}`);
    return { success: false, error: 'No matching capability domains' };
  }
  
  // 2. 查找最佳智能体
  const agentId = findBestAgent(domains, task.tags);
  if (!agentId) {
    console.warn(`[AgentRouter] No available agent for domains: ${domains.join(', ')}`);
    return { success: false, error: 'No available agent' };
  }
  
  // 3. 更新智能体状态
  updateAgentStatus(agentId, 'busy');
  
  // 4. 生成子会话（通过 OpenClaw 工具调用）
  try {
    // sessionKey will be returned by sessions_spawn tool
    const sessionKey = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    console.log(`[AgentRouter] Would spawn session for task ${task.id} with agent ${agentId}`);
    // Actual spawn happens via OpenClaw tool: sessions_spawn({...})
    
    console.log(`[AgentRouter] Task ${task.id} routed to ${agentId}, session: ${sessionKey}`);
    
    return {
      success: true,
      agentId,
      sessionKey
    };
  } catch (e) {
    updateAgentStatus(agentId, 'online'); // 回滚状态
    return {
      success: false,
      error: `Failed to spawn session: ${(e as Error).message}`
    };
  }
}

/**
 * 批量路由任务
 */
export async function routeTasks(tasks: Task[]): Promise<RouteResult[]> {
  return Promise.all(tasks.map(task => routeTask(task)));
}

/**
 * 重新路由失败任务
 */
export async function rerouteTask(
  task: Task,
  excludeAgentId: string
): Promise<RouteResult> {
  const domains = getDomainsForTags(task.tags);
  
  // 排除已失败的智能体
  const availableAgents = domains.flatMap(domain => 
    // 这里应该调用 findAgentsByDomains 并过滤
    []
  ).filter(id => id !== excludeAgentId);
  
  if (availableAgents.length === 0) {
    return { success: false, error: 'No alternative agent available' };
  }
  
  // 选择下一个最佳智能体
  const fallbackAgentId = availableAgents[0];
  
  // 类似 routeTask 的逻辑...
  return routeTask({ ...task, tags: [...task.tags, 'rerouted'] });
}

/**
 * 获取路由统计
 */
export function getRoutingStats(): {
  totalRouted: number;
  successRate: number;
  avgRoutingTime: number;
} {
  // 实际实现应记录到数据库
  return {
    totalRouted: 0,
    successRate: 0,
    avgRoutingTime: 0
  };
}