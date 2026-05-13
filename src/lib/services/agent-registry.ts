/**
 * Agent Registry
 * 智能体注册中心 — 基于 OpenClaw 能力域的智能体管理
 */

import { AgentCapability, CapabilityDomain } from '@/lib/domains/capability-map';

// 内存存储（生产环境可替换为 Redis）
const agentStore = new Map<string, AgentCapability>();

/**
 * 注册智能体
 * @param agentId 智能体 ID
 * @param domains 支持的能力域
 * @param skills 具体技能标签
 * @param options 可选配置
 */
export function registerAgent(
  agentId: string,
  domains: CapabilityDomain[],
  skills: string[],
  options?: {
    priority?: number;
    maxConcurrent?: number;
  }
): void {
  agentStore.set(agentId, {
    agentId,
    domains,
    skills,
    priority: options?.priority ?? 50,
    maxConcurrent: options?.maxConcurrent ?? 3,
    status: 'online'
  });
  console.log(`[AgentRegistry] Registered: ${agentId} with domains [${domains.join(', ')}]`);
}

/**
 * 更新智能体状态
 */
export function updateAgentStatus(agentId: string, status: AgentCapability['status']): void {
  const agent = agentStore.get(agentId);
  if (agent) {
    agent.status = status;
    agentStore.set(agentId, agent);
  }
}

/**
 * 获取智能体信息
 */
export function getAgent(agentId: string): AgentCapability | undefined {
  return agentStore.get(agentId);
}

/**
 * 列出所有在线智能体
 */
export function listOnlineAgents(): AgentCapability[] {
  return Array.from(agentStore.values()).filter(a => a.status === 'online');
}

/**
 * 根据能力域查找智能体
 * @param domains 所需能力域
 * @param requireAll 是否要求支持所有域（默认 true）
 */
export function findAgentsByDomains(
  domains: CapabilityDomain[],
  requireAll: boolean = true
): AgentCapability[] {
  const agents = listOnlineAgents();
  
  if (requireAll) {
    // 必须支持所有指定域
    return agents.filter(agent => 
      domains.every(domain => agent.domains.includes(domain))
    );
  } else {
    // 支持任一域即可
    return agents.filter(agent => 
      domains.some(domain => agent.domains.includes(domain))
    );
  }
}

/**
 * 根据技能标签查找智能体
 */
export function findAgentsBySkills(skills: string[]): AgentCapability[] {
  return listOnlineAgents().filter(agent =>
    skills.some(skill => agent.skills.includes(skill))
  );
}

/**
 * 最佳匹配算法
 * 优先级：精确技能匹配 > 域覆盖度 > 优先级数值 > 空闲度
 */
export function findBestAgent(
  domains: CapabilityDomain[],
  skills?: string[]
): string | null {
  const candidates = findAgentsByDomains(domains);
  if (candidates.length === 0) return null;
  
  // 评分排序
  const scored = candidates.map(agent => {
    let score = 0;
    
    // 精确技能匹配（高权重）
    if (skills) {
      const skillMatches = agent.skills.filter(s => skills.includes(s)).length;
      score += skillMatches * 100;
    }
    
    // 域覆盖度
    const domainCoverage = agent.domains.filter(d => domains.includes(d)).length;
    score += domainCoverage * 50;
    
    // 优先级
    score += agent.priority;
    
    // 空闲度（假设有 concurrentTasks 字段）
    // score += (agent.maxConcurrent - (agent.concurrentTasks || 0)) * 10;
    
    return { agent, score };
  });
  
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.agent.agentId || null;
}

/**
 * 注销智能体
 */
export function unregisterAgent(agentId: string): void {
  agentStore.delete(agentId);
  console.log(`[AgentRegistry] Unregistered: ${agentId}`);
}

// 预注册默认智能体（基于 OpenClaw 能力域）
export function initializeDefaultAgents(): void {
  registerAgent('quill-agent', ['research', 'script'], ['文章写作', '竞品分析', '文案优化'], { priority: 80 });
  registerAgent('pixel-agent', ['visual', 'design'], ['封面设计', 'Banner制作', '配图方案'], { priority: 75 });
  registerAgent('hyper-agent', ['video'], ['视频剪辑', '动效制作', '字幕生成'], { priority: 70 });
  registerAgent('publisher-agent', ['publish'], ['多平台发布', '排期管理', '微信发布'], { priority: 60 });
  registerAgent('default-agent', ['research'], ['通用处理'], { priority: 30 });
}