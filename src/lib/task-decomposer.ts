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

// ====== LLM 配置（与 llm-content.ts 一致）======
import fs from 'fs';
import os from 'os';
import { join } from 'path';

function loadOpenClawConfig(): any {
  try {
    const configPath = join(os.homedir(), '.openclaw', 'openclaw.json');
    if (fs.existsSync(configPath)) return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch { /* ignore */ }
  return {};
}

function resolveModelConfig(model: string): { baseUrl: string; apiKey: string; provider: string } | null {
  const config = loadOpenClawConfig();
  const providers = config?.models?.providers || {};

  // 精确匹配
  for (const [name, p] of Object.entries(providers)) {
    const prov = p as any;
    if (!prov?.models) continue;
    for (const m of prov.models) {
      if (m.id === model) {
        let apiKey = prov.apiKey || '';
        if (apiKey.startsWith('${') && apiKey.endsWith('}')) {
          const envVar = apiKey.slice(2, -1);
          apiKey = process.env[envVar] || '';
        }
        return { baseUrl: (prov.baseUrl || 'https://api-inference.modelscope.cn/v1').replace(/\/$/, ''), apiKey, provider: name };
      }
    }
  }

  // 去掉前缀匹配
  const parts = model.split('/');
  if (parts.length > 1) {
    const suffix = parts.slice(1).join('/');
    for (const [name, p] of Object.entries(providers)) {
      const prov = p as any;
      if (!prov?.models) continue;
      for (const m of prov.models) {
        if (m.id === suffix) {
          let apiKey = prov.apiKey || '';
          if (apiKey.startsWith('${') && apiKey.endsWith('}')) {
            const envVar = apiKey.slice(2, -1);
            apiKey = process.env[envVar] || '';
          }
          return { baseUrl: (prov.baseUrl || 'https://api-inference.modelscope.cn/v1').replace(/\/$/, ''), apiKey, provider: name };
        }
      }
    }
  }

  return null;
}

const FALLBACK_MODELS = [
  'moonshotai/Kimi-K2.6',
  'MiniMax/MiniMax-M2.7',
  'ZhipuAI/GLM-5.1',
  'deepseek-ai/DeepSeek-V4-Pro',
];

// ====== 通过 OpenClaw 配置调用 LLM ======
async function callLLM(prompt: string, schema?: object): Promise<string> {
  for (const model of FALLBACK_MODELS) {
    const prov = resolveModelConfig(model);
    if (!prov) continue;

    const modelId = model.split('/').pop() || model;
    if (!prov.apiKey) { console.warn(`[TaskDecomposer] ${prov.provider}: no apiKey, skipping`); continue; }

    try {
      console.log(`[TaskDecomposer] ${prov.provider} | ${modelId}`);
      const body: any = {
        model: modelId,
        messages: [
          { role: 'system', content: '你是一个任务规划专家。严格按照用户要求的JSON格式输出，不使用markdown包裹。' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 4000,
        temperature: 0.3,
      };

      const res = await fetch(`${prov.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${prov.apiKey}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      });

      const data = await res.json() as any;
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

      const content = data.choices?.[0]?.message?.content || '';
      if (content.length < 20) throw new Error('Response too short');

      return content.trim();
    } catch (e: any) {
      console.warn(`[TaskDecomposer] ${model} failed: ${e.message}`);
    }
  }
  throw new Error('All LLM providers failed for task decomposition');
}

// ====== 复杂任务判断 ======
export function needsDecomposition(tags: string[], complexity?: number): boolean {
  if (tags?.includes('复合任务') || tags?.includes('complex-task')) return true;
  if (complexity && complexity >= 3) return true;
  return false;
}

// ====== 任务分解 ======
export async function decomposeComplexTask(
  title: string,
  description: string,
  tags: string[]
): Promise<DecomposeResult> {
  // 提取相关能力域
  const domains = getDomainsForTags(tags);
  const domainList = domains.length > 0 ? domains.join('、') : '通用';

  const prompt = `将以下任务拆解为 3-5 个可独立执行的子任务卡片，每个子任务需明确：
1. title: 子任务标题（简洁）
2. description: 详细描述
3. domain: 能力域（从以下选择：${Object.values(CAPABILITY_DOMAIN_MAP).join('、')}）
4. dependsOn: 依赖的子任务标题数组（无依赖则为空数组）
5. estimatedMinutes: 预计耗时（分钟）

原始任务：${title}
描述：${description || '无'}
相关领域：${domainList}

输出严格 JSON 格式，不要 markdown 包裹：
{"cards":[{"title":"...","description":"...","domain":"research","dependsOn":[],"estimatedMinutes":30}]}`;

  const raw = await callLLM(prompt);

  // 解析 JSON
  try {
    const cleaned = raw.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    const parsed = JSON.parse(cleaned) as DecomposeResult;
    if (Array.isArray(parsed.cards) && parsed.cards.length > 0) {
      console.log(`[TaskDecomposer] Decomposed "${title}" → ${parsed.cards.length} sub-tasks`);
      return parsed;
    }
    console.warn('[TaskDecomposer] Invalid format, using fallback');
  } catch (e) {
    console.warn('[TaskDecomposer] JSON parse failed, using fallback:', (e as Error).message);
  }

  // Fallback: 单子任务
  return {
    cards: [{
      title: `执行：${title}`,
      description: description || title,
      domain: domains[0] || 'research',
      dependsOn: [],
      estimatedMinutes: 60,
    }],
    originalTask: title,
  };
}
