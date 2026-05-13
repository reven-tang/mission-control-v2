/**
 * Self-Healing System
 * 自愈降级系统 — 三级错误处理策略
 */

import { routeTask, rerouteTask } from './agent-router';
import { updateAgentStatus, getAgent } from './agent-registry';

// 错误类型分类
export type ErrorType = 'timeout' | 'capability_mismatch' | 'rate_limit' | 'internal_error' | 'unknown';

interface ErrorContext {
  taskId: string;
  agentId: string;
  error: Error;
  retryCount: number;
  timestamp: number;
}

interface HealingResult {
  action: 'retry' | 'reroute' | 'escalate' | 'abort';
  newAgentId?: string;
  delayMs?: number;
  reason: string;
}

/**
 * 错误分类器
 */
export function classifyError(error: Error): ErrorType {
  const msg = error.message.toLowerCase();
  
  if (/timeout|abort|timed out/.test(msg)) return 'timeout';
  if (/capability|skill|not supported|cannot handle/.test(msg)) return 'capability_mismatch';
  if (/rate.*limit|quota|exceeded|throttle/.test(msg)) return 'rate_limit';
  if (/internal|500|server error/.test(msg)) return 'internal_error';
  
  return 'unknown';
}

/**
 * 三级自愈策略
 * Level 1: 同智能体重试（指数退避）
 * Level 2: 路由到其他智能体
 * Level 3: 升级到人工处理
 */
export async function healError(context: ErrorContext): Promise<HealingResult> {
  const { taskId, agentId, error, retryCount } = context;
  const errorType = classifyError(error);
  
  console.log(`[SelfHealing] Task ${taskId} failed with ${errorType}, retry ${retryCount}`);
  
  // Level 1: 同智能体重试（最多 2 次）
  if (retryCount < 2 && errorType !== 'capability_mismatch') {
    const delayMs = Math.pow(2, retryCount) * 1000; // 1s, 2s
    return {
      action: 'retry',
      delayMs,
      reason: `Retrying same agent after ${errorType}`
    };
  }
  
  // Level 2: 路由到其他智能体
  if (retryCount < 4) {
    const agent = getAgent(agentId);
    if (agent) {
      // 标记当前智能体为离线
      updateAgentStatus(agentId, 'offline');
      
      return {
        action: 'reroute',
        newAgentId: 'fallback', // 实际应查找替代智能体
        delayMs: 500,
        reason: `Rerouting from ${agentId} due to ${errorType}`
      };
    }
  }
  
  // Level 3: 升级到人工
  return {
    action: 'escalate',
    reason: `Max retries exceeded for ${errorType}, escalating to human`
  };
}

/**
 * 执行自愈动作
 */
export async function executeHealing(
  task: any,
  healingResult: HealingResult
): Promise<boolean> {
  switch (healingResult.action) {
    case 'retry':
      if (healingResult.delayMs) {
        await new Promise(r => setTimeout(r, healingResult.delayMs));
      }
      // 重新执行原任务
      console.log(`[SelfHealing] Retrying task ${task.id}`);
      return true;
      
    case 'reroute':
      if (healingResult.delayMs) {
        await new Promise(r => setTimeout(r, healingResult.delayMs));
      }
      const result = await rerouteTask(task, task.assignedAgentId);
      return result.success;
      
    case 'escalate':
      // 移动到人工队列
      console.log(`[SelfHealing] Escalating task ${task.id} to human queue`);
      // task.system.moveToColumn('needs-human');
      return false;
      
    case 'abort':
      console.log(`[SelfHealing] Aborting task ${task.id}`);
      return false;
      
    default:
      return false;
  }
}

/**
 * 监控智能体健康状态
 */
export async function monitorAgentHealth(agentId: string): Promise<{
  healthy: boolean;
  lastError?: Error;
  recommendation?: string;
}> {
  const agent = getAgent(agentId);
  if (!agent) return { healthy: false, recommendation: 'Agent not found' };
  
  // 简单的健康检查逻辑
  if (agent.status === 'offline') {
    return {
      healthy: false,
      recommendation: 'Consider restarting agent or checking network'
    };
  }
  
  return { healthy: true };
}

/**
 * 自愈系统初始化
 */
export function initializeSelfHealing(): void {
  console.log('[SelfHealing] System initialized with 3-level strategy');
  
  // 定期健康检查（每 5 分钟）
  setInterval(async () => {
    // 检查所有智能体健康状态
    // const agents = listOnlineAgents();
    // for (const agent of agents) {
    //   const health = await monitorAgentHealth(agent.agentId);
    //   if (!health.healthy) {
    //     console.warn(`[SelfHealing] Agent ${agent.agentId} unhealthy: ${health.recommendation}`);
    //   }
    // }
  }, 5 * 60 * 1000);
}