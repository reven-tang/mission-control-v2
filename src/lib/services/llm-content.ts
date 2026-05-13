// LLM Content Generation Service
// 完全复用 OpenClaw 配置：自动匹配 11 providers / 262 models
// 按模型名 → 对应 provider 的 baseUrl + apiKey

import fs from 'fs';
import os from 'os';
import { join } from 'path';

// ====== 读取 OpenClaw 完整配置 ======
function loadOpenClawConfig(): any {
  try {
    const configPath = join(os.homedir(), '.openclaw', 'openclaw.json');
    if (fs.existsSync(configPath)) return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (e: any) { console.warn('[LLM] Config load failed:', e.message); }
  return {};
}

// ====== Provider 映射（30s 缓存）======
let _providerCache: ReturnType<typeof buildProviderMap> | null = null;
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
      apiKey = envCache[envVar] || (envCache[envVar] = getEnv(envVar));
    }

    const baseUrl = (p.baseUrl || 'https://api-inference.modelscope.cn/v1').replace(/\/$/, '');

    for (const m of p.models) {
      const modelId = m.id || m.name;
      if (modelId) map.set(modelId, { baseUrl, apiKey, provider: providerName });
    }
  }

  _providerCache = map;
  _cacheTime = now;
  console.log(`[LLM] Provider map: ${map.size} models from ${Object.keys(providers).length} providers`);
  return map;
}

/**
 * 根据模型名解析 Provider
 * 'moonshotai/Kimi-K2.6' → 精确匹配
 * 'sdw-modelscope/moonshotai/Kimi-K2.6' → 去掉前缀再匹配
 */
function resolveProvider(model: string): { baseUrl: string; apiKey: string; provider: string } | null {
  const map = buildProviderMap();

  // 1. 精确匹配
  if (map.has(model)) return map.get(model)!;

  // 2. 去掉 provider 前缀匹配
  const parts = model.split('/');
  if (parts.length > 1) {
    const suffix = parts.slice(1).join('/');
    if (map.has(suffix)) return map.get(suffix)!;
    // 最后一段模糊匹配
    const last = parts[parts.length - 1];
    for (const [key, val] of Array.from(map.entries())) {
      if (key.endsWith(last) || (last && key.includes(last))) return val;
    }
  }

  return null;
}

// ====== 写作质量排序（fallback 顺序）======
const MODEL_FALLBACKS = [
  'moonshotai/Kimi-K2.6',       // 魔塔社区主模型
  'MiniMax/MiniMax-M2.7',        // 魔塔社区备选
  'ZhipuAI/GLM-5.1',             // 魔塔社区备选
  'deepseek-ai/DeepSeek-V4-Pro', // 魔塔社区备选
];

// ====== System Prompts ======
const ARTICLE_SYSTEM_PROMPT = `你是资深自媒体写手，擅长"有理有据+引人深思"的写作风格。

写作要求：
**内容结构**
1. 开头引言：用一句点题的话或数据做引子，2-3行
2. 章节标题：用 "01" "02" "03" 居中数字标题
3. 每个章节：2-4个分段，每段2-4行
4. 结尾升华：从数据上升到哲学层面

**排版格式**
1. 段落：<p style="line-height:2;margin-bottom:1em;">
2. 重点：<strong style="color:#FF6B00;">橙色加粗</strong>
3. 章节：<h2 style="text-align:center;color:#FF6B00;font-size:24px;margin:2em 0 0.5em;">01</h2>
4. 小标题：<h3 style="line-height:1.8;margin:1.2em 0 0.6em;">
5. 引用：<blockquote style="background:#f5f5f5;border-left:3px solid #FF6B00;padding:15px;margin:20px 0;line-height:2;">

**要求**
1. 真实数据开头 2. 字数1500-3000字
直接输出HTML，不要外层标签，不要markdown包裹。`;

const HUMANIZER_PROMPT = `你是文章润色专家。对下面这篇文章做 humanize 处理，去掉 AI 写作痕迹：
删除"首先/其次/最后/此外/然而/因此"等连接词
拆除"研究表明/据数据"等模糊归属
精简膨胀形容词
拆短复合句
保持格式不变。直接输出HTML，不要解释。`;

// ====== 核心调用 ======
async function callLLM(model: string, systemPrompt: string, userPrompt: string, maxRetries = 3): Promise<string> {
  const prov = resolveProvider(model);
  if (!prov) throw new Error(`No provider found for model: ${model}`);
  const modelId = model.split('/').pop() || model;
  const url = `${prov.baseUrl}/chat/completions`;

  if (!prov.apiKey) console.warn(`[LLM] ${prov.provider}: apiKey not set`);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[LLM] ${prov.provider} | ${modelId} | attempt ${attempt + 1}/${maxRetries + 1}`);
      const body = {
        model: modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 6000,
        temperature: 0.85,
      };

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (prov.apiKey) headers['Authorization'] = `Bearer ${prov.apiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      });

      const data = await res.json() as any;
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

      let content = data.choices?.[0]?.message?.content || '';
      if (content.length < 50) throw new Error('LLM content too short');

      const cnChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
      if (cnChars < 30) throw new Error('LLM quality check failed: too short');

      // 清理
      let cleaned = content;
      if (cleaned.startsWith('```html')) cleaned = cleaned.slice(7);
      if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
      cleaned = cleaned.replace(/^<!DOCTYPE[^>]*>\s*/i, '');
      cleaned = cleaned.replace(/^<html[^>]*>\s*/i, '');
      cleaned = cleaned.replace(/^<head[^>]*>[\s\S]*?<\/head>\s*/i, '');
      cleaned = cleaned.replace(/^<body[^>]*>\s*/i, '');
      cleaned = cleaned.replace(/<\/body>\s*<\/html>\s*$/i, '');
      cleaned = cleaned.replace(/<p[^>]*>\s*<\/p>/gi, '');

      const visibleChars = cleaned.replace(/<[^>]+>/g, '').length;
      if (visibleChars < 800) throw new Error(`Too short: ${visibleChars} chars`);

      return cleaned.trim();
    } catch (e: any) {
      lastError = e;
      const isRetryable = /quota|exceeded|exhaust|timeout|abort/i.test(e.message);
      if (isRetryable && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      console.error(`[LLM] Failed:`, e.message);
      throw e;
    }
  }
  throw lastError || new Error('Unknown error');
}

// ====== 导出 ======
export async function generateArticle(topic: string): Promise<string> {
  for (const model of MODEL_FALLBACKS) {
    try {
      console.log(`[LLM] Generate: ${model}`);
      return await callLLM(model, ARTICLE_SYSTEM_PROMPT, `写一篇关于"${topic}"的深度文章。`);
    } catch (e: any) {
      console.log(`[LLM] ${model} failed: ${e.message}, trying next...`);
    }
  }
  throw new Error('All models exhausted');
}

export async function humanizeArticle(rawHtml: string): Promise<string> {
  for (const model of MODEL_FALLBACKS) {
    try {
      return await callLLM(model, HUMANIZER_PROMPT, `润色以下文章：\n\n${rawHtml}`);
    } catch (e: any) {
      console.log(`[Humanizer] ${model} failed`);
    }
  }
  return rawHtml;
}

export async function generateVisualDescription(topic: string, articleContent: string): Promise<string> {
  try {
    return await callLLM(MODEL_FALLBACKS[0], '你是视觉设计师。输出HTML格式配图方案。', `主题：${topic}\n摘要：${articleContent.slice(0, 200)}`);
  } catch {
    return `<h3>🎨 配图方案</h3><p>为"${topic}"生成。</p>`;
  }
}

// 诊断导出
export { buildProviderMap, resolveProvider, loadOpenClawConfig };
