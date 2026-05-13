/**
 * Task Decomposer
 * 动态任务分解器 — 完全复用 OpenClaw 配置的 LLM
 */

import { CAPABILITY_DOMAIN_MAP, CapabilityDomain, getDomainsForTags } from '@/lib/domains/capability-map';

// 子任务接口
export interface SubTask {
  title: string;
  description: string;
  domain: CapabilityDomain;
  dependsOn: string[];
  estimatedMinutes: number;
}

export interface DecomposeResult {
  cards: SubTask[];
  originalTask: string;
}

// ====== 复用 llm-content.ts 的配置 ======
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

let _providerCache: Map<string, { baseUrl: string; apiKey: string; provider: string }> | null = null;
let _cacheTime = 0;
const CACHE_TTL = 30000;

function buildProviderMap(): Map<string, { baseUrl: string; apiKey: string; provider: string }> {
  const now = Date.now();
  if (_providerCache && (now - _cacheTime) < CACHE_TTL) return _providerCache;

  const config = loadOpenClawConfig();
  const providers = config?.models?.providers || {};
  const map = new Map<string, { baseUrl: string; apiKey: string; provider: string }>();
  const envCache: Record<string, string> = {};

  for (const [providerName, provConfig] of Object.entries(providers)) {
    const p: any = provConfig;
    if (!p?.models || !Array.isArray(p.models)) continue;

    let apiKey = p.apiKey || '';
    if (apiKey.startsWith('${') && apiKey.endsWith('}')) {
      const envVar = apiKey.slice(2, -1);
      apiKey = envCache[envVar] || (envCache[envVar] = process.env[envVar] || '');
    }

    const baseUrl = (p.baseUrl || 'https://api-inference.modelscope.cn/v1').replace(/\/$/, '');
    for (const m of p.models) {
      const modelId = m.id || m.name;
      if (modelId) map.set(modelId, { baseUrl, apiKey, provider: providerName });
    }
  }

  _providerCache = map;
  _cacheTime = now;
  return map;
}

function resolveModelConfig(model: string): { baseUrl: string; apiKey: string; provider: string } | null {
  const map = buildProviderMap();

  // 1. 精确匹配
  if (map.has(model)) return map.get(model)!;

  // 2. 去掉 provider 前缀
  const parts = model.split('/');
  if (parts.length > 1) {
    const suffix = parts.slice(1).join('/');
    if (map.has(suffix)) return map.get(suffix)!;
    const last = parts[parts.length - 1];
    for (const [key, val] of Array.from(map.entries())) {
      if (key.endsWith(last) || key.includes(last)) return val;
    }
  }

  return null;
}

// Fallback 模型列表（魔塔社区配置的模型）
const FALLBACK_MODELS = [
  'deepseek-ai/DeepSeek-V3.2',
  'deepseek-ai/DeepSeek-V4-Flash',
  'deepseek-ai/DeepSeek-R1-0528',
];

// ====== 通过 OpenClaw 配置调用 LLM ======
async function callLLM(prompt: string): Promise<string> {
  for (const model of FALLBACK_MODELS) {
    const prov = resolveModelConfig(model);
    if (!prov) continue;

    const modelId = model;
    if (!prov.apiKey) { console.warn(`[TaskDecomposer] ${prov.provider}: no apiKey, skipping`); continue; }

    try {
      console.log(`[TaskDecomposer] ${prov.provider} | ${modelId}`);
      const body = {
        model: modelId,
        messages: [
          { role: 'system', content: '你是一个任务规划专家。严格按照JSON格式输出，不要markdown包裹。' },
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
  throw new Error('All LLM providers failed');
}

// ====== 复杂任务判断 ======
export function needsDecomposition(tags: string[], complexity?: number): boolean {
  if (tags?.includes('复合任务') || tags?.includes('complex-task')) return true;
  if (complexity && complexity >= 3) return true;
  return false;
}

// ====== 任务分解 ======
const DOMAIN_LIST = Object.values(CAPABILITY_DOMAIN_MAP).join('、');

export async function decomposeComplexTask(
  title: string,
  description: string,
  tags: string[]
): Promise<DecomposeResult> {
  const domains = getDomainsForTags(tags);
  const domainHint = domains.length > 0 ? domains.join('、') : '通用';

  const prompt = `将以下任务拆解为 3-5 个可独立执行的子任务卡片，每个子任务需明确：
1. title: 子任务标题（简洁）
2. description: 详细描述
3. domain: 能力域（从以下选择：${DOMAIN_LIST}）
4. dependsOn: 依赖的子任务标题数组（无依赖则为空数组）
5. estimatedMinutes: 预计耗时（分钟）

原始任务：${title}
描述：${description || '无'}
相关领域：${domainHint}

输出严格 JSON 格式，不要 markdown 包裹：
{"cards":[{"title":"...","description":"...","domain":"research","dependsOn":[],"estimatedMinutes":30}]}`;

  const raw = await callLLM(prompt);

  try {
    const cleaned = raw.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    const parsed = JSON.parse(cleaned) as DecomposeResult;
    if (Array.isArray(parsed.cards) && parsed.cards.length > 0) {
      console.log(`[TaskDecomposer] "${title}" → ${parsed.cards.length} sub-tasks`);
      return parsed;
    }
  } catch (e) {
    console.warn('[TaskDecomposer] JSON parse failed, using fallback:', (e as Error).message);
  }

  // Fallback
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
