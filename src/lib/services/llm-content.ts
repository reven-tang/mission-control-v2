// LLM Content Generation Service
// 自动适配 OpenClaw 配置的所有 Provider（sdw-modelscope / modelscope / sjz-modelscope / blockrun 等）
// 按模型名前缀自动匹配 → 对应 baseUrl + apiKey

import fs from 'fs';
import os from 'os';
import { join } from 'path';

// ====== 读取 OpenClaw 完整配置 ======
function loadOpenClawConfig(): any {
  try {
    const configPath = join(os.homedir(), '.openclaw', 'openclaw.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (e: any) { console.warn('[LLM] Config load failed:', e.message); }
  return {};
}

/**
 * 从 OpenClaw 配置构建 Provider 映射
 * 返回: Map<modelId, { baseUrl, apiKey, providerName }>
 */
function buildProviderMap(): Map<string, { baseUrl: string; apiKey: string; provider: string }> {
  const config = loadOpenClawConfig();
  const providers = config?.models?.providers || {};
  const map = new Map<string, { baseUrl: string; apiKey: string; provider: string }>();
  const envCache: Record<string, string> = {};

  for (const [providerName, provConfig] of Object.entries(providers)) {
    const p: any = provConfig;
    if (!p?.models || !Array.isArray(p.models)) continue;

    let apiKey = p.apiKey || '';
    // 环境变量解析: ${ENV_VAR}
    if (apiKey.startsWith('${') && apiKey.endsWith('}')) {
      const envVar = apiKey.slice(2, -1);
      if (envCache[envVar]) {
        apiKey = envCache[envVar];
      } else {
        apiKey = process.env[envVar] || '';
        envCache[envVar] = apiKey;
      }
    }

    const baseUrl = p.baseUrl || 'https://api-inference.modelscope.cn/v1';

    for (const m of p.models) {
      const modelId = m.id || m.name;
      if (modelId) {
        map.set(modelId, { baseUrl, apiKey, provider: providerName });
      }
    }
  }

  return map;
}

/**
 * 根据模型名解析 Provider
 * 'sdw-modelscope/moonshotai/Kimi-K2.6' → { baseUrl, apiKey, provider: 'sdw-modelscope' }
 * 'moonshotai/Kimi-K2.6' → 自动匹配 providers 中的 models.id
 */
function resolveProvider(model: string): { baseUrl: string; apiKey: string; provider: string } | null {
  const map = buildProviderMap();

  // 1. 精确匹配完整 model id
  if (map.has(model)) return map.get(model)!;

  // 2. 提取后缀匹配（去掉 provider 前缀）
  // 'sdw-modelscope/moonshotai/Kimi-K2.6' → 'moonshotai/Kimi-K2.6'
  const parts = model.split('/');
  const suffix = parts.length > 1 ? parts.slice(1).join('/') : model;
  
  // 精确匹配 suffix
  for (const [key, val] of map) {
    if (key === suffix) return val;
  }

  // 3. 模糊匹配（包含 model 关键部分）
  const modelShort = parts[parts.length - 1]; // 最后一段
  for (const [key, val] of map) {
    if (key.includes(modelShort) || modelShort.includes(key.split('/').pop() || '')) {
      return val;
    }
  }

  return null;
}

// ====== 模型优先级排序 ======
const PRIORITY_ORDER = [
  'moonshotai/Kimi-K2.6', 'moonshotai/Kimi-K2.5',
  'MiniMax/MiniMax-M2.7', 'MiniMax/MiniMax-M2.5',
  'ZhipuAI/GLM-5.1', 'ZhipuAI/GLM-5',
  'deepseek-ai/DeepSeek-V4-Pro', 'deepseek-ai/DeepSeek-V3.2',
  'Qwen/Qwen3-235B-A22B-Instruct-2507', 'Qwen/Qwen3.5-397B-A17B',
  'stepfun-ai/Step-3.5-Flash',
];
const UNAVAILABLE = new Set([
  'moonshotai/Kimi-K2.6', 'Qwen/Qwen3-Coder-Next', 'Tencent-Hunyuan/Hy3-preview',
]);

// 加载 OpenClaw 模型列表
function loadOpenClawModels(): { primary: string; fallbacks: string[] } {
  const config = loadOpenClawConfig();
  const model = config?.agents?.defaults?.model;
  if (model?.primary) {
    const primary = model.primary;
    const fallbacks = (model.fallbacks || []).filter((m: string) => m !== primary);
    return { primary, fallbacks };
  }
  return { primary: 'moonshotai/Kimi-K2.6', fallbacks: ['MiniMax/MiniMax-M2.7'] };
}

let OC_MODELS = loadOpenClawModels();
const allModels = [OC_MODELS.primary, ...OC_MODELS.fallbacks]
  .filter((m: string) => !UNAVAILABLE.has(m))
  .sort((a: string, b: string) => {
    const aIdx = PRIORITY_ORDER.indexOf(a); const bIdx = PRIORITY_ORDER.indexOf(b);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });
OC_MODELS.primary = allModels[0] || 'moonshotai/Kimi-K2.6';
OC_MODELS.fallbacks = allModels.slice(1);
console.log(`[LLM] Models: primary=${OC_MODELS.primary}, fallbacks=${OC_MODELS.fallbacks.length}`);

// ====== System Prompts ======
const ARTICLE_SYSTEM_PROMPT = `你是资深自媒体写手，擅长"有理有据+引人深思"的写作风格。

写作要求：
**内容结构**
1. 开头引言：用一句点题的话或数据做引子，2-3行
2. 章节标题：用 "01" "02" "03" 居中数字标题
3. 每个章节：2-4个分段，每段2-4行
4. 结尾升华：从数据上升到哲学层面

**排版格式**
1. 段落行距：<p style="line-height:2;margin-bottom:1em;">2倍行距
2. 重点句：<strong style="color:#FF6B00;">橙色加粗</strong>
3. 章节标题：<h2 style="text-align:center;color:#FF6B00;font-size:24px;margin:2em 0 0.5em;">01</h2>
4. 小标题：<h3 style="line-height:1.8;margin:1.2em 0 0.6em;">加粗小标题</h3>
5. 引用框：<blockquote style="background:#f5f5f5;border-left:3px solid #FF6B00;padding:15px;margin:20px 0;line-height:2;">

**内容要求**
1. 用真实数据开头（年份、百分比、调研报告）
2. 每个观点有数据或案例支撑
3. 结尾上升到哲学层面
4. 字数：1500-3000字

直接输出HTML段落，不要 markdown 代码块包裹。
禁止输出 <!DOCTYPE html>、<html>、<head>、<body> 等外层标签，只输出文章正文 HTML 片段。`;

const HUMANIZER_PROMPT = `你是文章润色专家。对下面这篇文章做 humanize 处理，去掉 AI 写作痕迹：
**必须去除的 AI 模式：**
1. 删除"首先/其次/最后/此外/然而/因此"等过度连接词
2. 拆除"研究表明/据数据/专家指出"等模糊归属
3. 精简膨胀形容词
4. 拆短复合句，多用短句
5. 加入口语化表达
6. 保持2倍行距和橙色强调格式不变
直接输出润色后的HTML，不要解释。`;

// ====== 核心调用 ======
async function callLLM(model: string, systemPrompt: string, userPrompt: string, maxRetries = 3): Promise<string> {
  // 解析 Provider
  const prov = resolveProvider(model);
  if (!prov) throw new Error(`No provider found for model: ${model}`);
  
  // 提取 model id（去掉 provider 前缀）
  const modelId = model.split('/').pop() || model;
  const url = `${prov.baseUrl.replace(/\/$/, '')}/chat/completions`;
  
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
      
      // 质量检测
      const cnChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
      const looksLikeError = /sorry|cannot assist|cannot fulfill|exceeded|quota|not supported/i.test(content);
      if (cnChars < 30 || looksLikeError) {
        throw new Error('LLM quality check failed');
      }

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
      const isRetryable = /quota|exceeded|exhaust|timeout|provider|unsupported|abort/i.test(e.message);
      if (isRetryable && attempt < maxRetries) {
        console.log(`[LLM] Retryable: ${e.message}`);
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      console.error(`[LLM] Failed:`, e.message);
      throw e;
    }
  }
  throw lastError || new Error('Unknown error');
}

function isRetryableError(err: Error): boolean {
  return /quota|exceeded|exhaust|too short|provider|unsupported/i.test(err.message);
}

// ====== 导出 ======
export async function generateArticle(topic: string): Promise<string> {
  for (const model of [OC_MODELS.primary, ...OC_MODELS.fallbacks]) {
    try {
      console.log(`[LLM] Generate: ${model}`);
      return await callLLM(model, ARTICLE_SYSTEM_PROMPT, `写一篇关于"${topic}"的深度文章。`);
    } catch (e: any) {
      if (isRetryableError(e)) { console.log(`[LLM] ${model} failed, trying next...`); continue; }
      throw e;
    }
  }
  throw new Error('All models exhausted');
}

export async function humanizeArticle(rawHtml: string): Promise<string> {
  for (const model of [OC_MODELS.primary, ...OC_MODELS.fallbacks]) {
    try {
      return await callLLM(model, HUMANIZER_PROMPT, `润色以下文章：\n\n${rawHtml}`);
    } catch (e: any) {
      if (isRetryableError(e)) { console.log(`[Humanizer] ${model} failed`); continue; }
      return rawHtml;
    }
  }
  return rawHtml;
}

export async function generateVisualDescription(topic: string, articleContent: string): Promise<string> {
  try {
    return await callLLM(
      OC_MODELS.primary,
      '你是资深视觉设计师。输出HTML格式配图方案。',
      `为文章设计配图方案。主题：${topic}\n摘要：${articleContent.slice(0, 200)}`
    );
  } catch {
    return `<h3>🎨 配图方案</h3><p>为"${topic}"生成。</p>`;
  }
}

export { resolveProvider, buildProviderMap, loadOpenClawConfig };
