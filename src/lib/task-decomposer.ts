/**
 * Task Decomposer
 * 动态任务分解器 — 基于 OpenClaw 配置的 LLM 将复杂任务自动拆解为子任务
 */

import { CAPABILITY_DOMAIN_MAP, CapabilityDomain, getDomainsForTags } from '@/lib/domains/capability-map';

// 子任务接口
export interface SubTask {
  title: string;
  description: string;
  domain: CapabilityDomain;
  dependsOn: string[];  // 子任务 ID（依赖）
  estimatedMinutes: number;
}

// 分解结果
export interface DecomposeResult {
  cards: SubTask[];
  originalTask: string;
}

// 通过 OpenClaw 配置的模型调用（魔塔社区）
async function callLLM(prompt: string, schema?: object): Promise<string> {
  // 复用 OpenClaw 全局配置 — 无需独立配置
  const apiKey = process.env.MODELSCOPE_API_KEY;
  const model = process.env.OPENCLAW_DEFAULT_MODEL || 'deepseek-ai/DeepSeek-V4-Pro';
  
  if (!apiKey) throw new Error('MODELSCOPE_API_KEY not configured in OpenClaw env');
  
  const res = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '你是一个任务规划专家。严格按照用户要求的JSON格式输出，不使用markdown包裹。' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2000,
      temperature: 0.7
    }),
    signal: AbortSignal.timeout(30000)
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  
  let content = data.choices?.[0]?.message?.content || '';
  // 清理 markdown 围栏
  content = content.replace(/```json/g, '').replace(/```/g, '').trim();
  return content;
}

// 严格 JSON 解析（含修复）
function strictJSONParse(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    // 尝试修复常见问题：单引号 → 双引号，无引号 key → 加引号
    const fixed = str
      .replace(/'/g, '"')
      .replace(/(\b\w+\b)(?=\s*:)/g, '"$1"')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    try {
      return JSON.parse(fixed);
    } catch {
      throw new Error('JSON 解析失败: ' + str.slice(0, 100));
    }
  }
}

/**
 * 分解复杂任务为子任务
 * @param taskTitle 任务标题
 * @param taskDescription 任务描述（可选）
 * @param tags 任务标签（用于推断能力域）
 * @returns 子任务列表
 */
export async function decomposeComplexTask(
  taskTitle: string,
  taskDescription?: string,
  tags?: string[]
): Promise<DecomposeResult> {
  // 推断能力域
  const domains = tags ? getDomainsForTags(tags) : [];
  const domainHint = domains.length > 0 ? `（关联能力域：${domains.join(', ')}）` : '';
  
  const prompt = `将任务"${taskTitle}"${taskDescription ? `（描述：${taskDescription}）` : ''}${domainHint}分解为最多5个可独立执行的子任务。
输出JSON数组，每个元素包含：title（任务标题）, description（任务描述）, domain（能力域：research|script|visual|video|publish）, dependsOn（依赖的其他任务标题数组）, estimatedMinutes（预计分钟数）。
只输出JSON数组，不要解释。`;

  try {
    const raw = await callLLM(prompt);
    const cards: SubTask[] = strictJSONParse(raw);
    
    // 校验
    if (!Array.isArray(cards) || cards.length === 0) {
      return { cards: [{ title: taskTitle, description: taskDescription || '', domain: 'research', dependsOn: [], estimatedMinutes: 60 }], originalTask: taskTitle };
    }
    
    return { cards: cards.slice(0, 5), originalTask: taskTitle };
  } catch (e) {
    // 降级：返回原始任务作为单卡片
    console.warn('[TaskDecomposer] LLM 分解失败，降级为单任务:', (e as Error).message);
    return {
      cards: [{ title: taskTitle, description: taskDescription || '', domain: domains[0] || 'research', dependsOn: [], estimatedMinutes: 60 }],
      originalTask: taskTitle
    };
  }
}

/**
 * 判断任务是否需要分解（复杂度评估）
 */
export function needsDecomposition(tags: string[], complexity?: number): boolean {
  // 复杂度 >= 3 或包含复合标签
  if (complexity && complexity >= 3) return true;
  const complexTags = ['复合任务', '多阶段', '全流程', '自动', '复杂'];
  return tags.some(tag => complexTags.includes(tag));
}