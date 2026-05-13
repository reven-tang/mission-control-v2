// LLM Content Generation Service
// 模型跟随 OpenClaw 配置，自动适配用户切换
// 文章产出前用 humanizer 去除 AI 味

import fs from 'fs';
import os from 'os';
import { join } from 'path';

// ====== 读取 OpenClaw 模型配置 ======
function loadOpenClawModels(): { primary: string; fallbacks: string[] } {
  try {
    const configPath = join(os.homedir(), '.openclaw', 'openclaw.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const model = config?.agents?.defaults?.model;
      if (model?.primary) {
        const primary = model.primary.replace('sdw-modelscope/', '');
        const fallbacks = (model.fallbacks || [])
          .map((m: string) => m.replace('sdw-modelscope/', ''))
          .filter((m: string) => m !== primary);
        console.log(`[LLM] OpenClaw models: primary=${primary}, fallbacks=${fallbacks.length}`);
        return { primary, fallbacks };
      }
    }
  } catch (e) { /* ignore */ }
  // 兜底
  return { primary: 'deepseek-ai/DeepSeek-V4-Pro', fallbacks: ['moonshotai/Kimi-K2.6'] };
}

// ====== 模型优先级排序 ======
// 按长文写作质量排序：deepseek > kimi > miniMax > glm > qwen > stepfun
const PRIORITY_ORDER = [
  'deepseek-ai/DeepSeek-V4-Pro', 'deepseek-ai/DeepSeek-V3.2', 'deepseek-ai/DeepSeek-R1-0528',
  'moonshotai/Kimi-K2.6', 'moonshotai/Kimi-K2.5',
  'MiniMax/MiniMax-M2.7', 'MiniMax/MiniMax-M2.5',
  'ZhipuAI/GLM-5.1', 'ZhipuAI/GLM-5',
  'Qwen/Qwen3-235B-A22B-Instruct-2507',
  'Qwen/Qwen3.5-122B-A10B', 'Qwen/Qwen3.5-397B-A17B',
  'deepseek-ai/DeepSeek-V4-Flash',
];
// 完全不可用（API 不支持）
const UNAVAILABLE = new Set([
  'moonshotai/Kimi-K2.6',  // ModelScope API: no provider supported
  'Qwen/Qwen3.6-35B-A3B', 'Qwen/Qwen3.6-27B',
  'Qwen/Qwen3-Coder-Next', 'Tencent-Hunyuan/Hy3-preview',
]);

let OC_MODELS = loadOpenClawModels();

// 过滤可用模型 + 按优先级排序
const allModels = [OC_MODELS.primary, ...OC_MODELS.fallbacks]
  .filter(m => !UNAVAILABLE.has(m))
  .sort((a, b) => {
    const aIdx = PRIORITY_ORDER.indexOf(a);
    const bIdx = PRIORITY_ORDER.indexOf(b);
    const aOk = aIdx === -1 ? 999 : aIdx;
    const bOk = bIdx === -1 ? 999 : bIdx;
    return aOk - bOk;
  });
OC_MODELS.primary = allModels[0] || 'deepseek-ai/DeepSeek-V4-Pro';
OC_MODELS.fallbacks = allModels.slice(1);
console.log(`[LLM] Models: primary=${OC_MODELS.primary}, fallbacks=${OC_MODELS.fallbacks.length}`);

// ====== 环境变量 ======
import { loadEnv } from '@/lib/utils/env';

const _env = loadEnv();
const API_KEY = process.env.MODELSCOPE_API_KEY || _env.MODELSCOPE_API_KEY;
const API_URL = 'https://api-inference.modelscope.cn/v1/chat/completions';

// ====== System Prompts ======
const ARTICLE_SYSTEM_PROMPT = `你是资深自媒体写手，擅长"有理有据+引人深思"的写作风格。

写作要求：

**内容结构**
1. **开头引言（灰底引用框）**：用一句点题的话或数据做引子，2-3行
2. **章节标题**：用 "01" "02" "03" 居中数字标题，下面跟黑色小标题
3. **每个章节**：2-4个分段，每段2-4行，留白充足
4. **结尾升华**：从数据上升到哲学层面，引发自我反思

**排版格式（必须）**
1. **段落行距**：所有文字段落用 <p style="line-height:2;margin-bottom:1em;"> 2倍行距
2. **重点句**：用 <strong style="color:#FF6B00;">橙色加粗</strong> 突出核心观点
3. **章节标题**：<h2 style="text-align:center;color:#FF6B00;font-size:24px;margin:2em 0 0.5em;">01</h2> 居中橙色数字
4. **小标题**：<h3 style="line-height:1.8;margin:1.2em 0 0.6em;">加粗小标题</h3>
5. **引用框**：<blockquote style="background:#f5f5f5;border-left:3px solid #FF6B00;padding:15px;margin:20px 0;line-height:2;">

**内容要求**
1. 用真实数据开头（年份、百分比、调研报告）
2. 每个观点有数据或案例支撑
3. 结尾上升到哲学层面
4. 字数：1500-3000字

直接输出HTML段落，不要 markdown 代码块包裹。
禁止输出 <!DOCTYPE html>、<html>、<head>、<body> 等外层标签，只输出文章正文 HTML 片段。`;

const HUMANIZER_PROMPT = `你是文章润色专家。对下面这篇文章做 humanize 处理，去掉 AI 写作痕迹：

**必须去除的 AI 模式：**
1. 删除所有"首先/其次/最后/此外/然而/因此"等过度连接词
2. 拆除所有"研究表明/据数据/专家指出"等模糊归属，改成具体表述
3. 精简膨胀形容词：去掉"关键的/重要的/至关重要的/关键的/决定性的"等废话
4. 拆短复合句，多用人会说的短句
5. 加入口语化表达：偶尔用"说白了/你想想/这才是要命的"这类人话
6. 保持2倍行距和橙色强调的排版格式不变

直接输出润色后的HTML，不要解释你做了什么。
禁止输出 <!DOCTYPE html>、<html>、<head>、<body> 等外层标签，只输出文章正文 HTML 片段。`;

// ====== 核心调用 ======
async function callLLM(model: string, systemPrompt: string, userPrompt: string, maxRetries = 3): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[LLM] Attempt ${attempt + 1}/${maxRetries + 1}: ${model}`);
      const body = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 6000,
        temperature: 0.85,
      };

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000), // 60s timeout
      });

      const data = await res.json() as { error?: { message: string }; choices?: [{ message: { content?: string } }] };

      if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
      }

      let content = data.choices?.[0]?.message?.content || '';
      if (content.length < 50) throw new Error('LLM content too short');
      
      // 质量检测
      const cnChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
      const looksLikeError = /sorry|cannot assist|cannot fulfill|exceeded|quota|not supported|模型/i.test(content);
      if (cnChars < 30 || looksLikeError) {
        throw new Error('LLM quality check failed: too short or error response');
      }

      // ====== 清理 ======
      let cleaned = content;

      // 1. 去掉 markdown fence
      if (cleaned.startsWith('```html')) cleaned = cleaned.slice(7);
      if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);

      // 2. 去掉完整 HTML 文档包裹
      cleaned = cleaned.replace(/^<!DOCTYPE[^>]*>\s*/i, '');
      cleaned = cleaned.replace(/^<html[^>]*>\s*/i, '');
      cleaned = cleaned.replace(/^<head[^>]*>[\s\S]*?<\/head>\s*/i, '');
      cleaned = cleaned.replace(/^<body[^>]*>\s*/i, '');
      cleaned = cleaned.replace(/<\/body>\s*<\/html>\s*$/i, '');

      // 3. 去掉空段落
      cleaned = cleaned.replace(/<p[^>]*>\s*<\/p>/gi, '');
      cleaned = cleaned.replace(/<p>\s*<\/p>/g, '');

      // 4. 确保最小文章长度
      const visibleChars = cleaned.replace(/<[^>]+>/g, '').length;
      if (visibleChars < 800) {
        throw new Error(`Article too short: ${visibleChars} visible chars (min 800)`);
      }

      return cleaned.trim();
    } catch (e: any) {
      lastError = e;
      const isRetryable = /quota|exceeded|exhaust|timeout|provider|unsupported|abort/i.test(e.message);
      
      if (isRetryable && attempt < maxRetries) {
        console.log(`[LLM] Retryable error, retrying... (${attempt + 1}/${maxRetries}): ${e.message}`);
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // Exponential backoff
        continue;
      }
      
      console.error(`[LLM] Failed after ${attempt + 1} attempts:`, e.message);
      throw e;
    }
  }
  
  throw lastError || new Error('Unknown error in LLM call');
}

function isRetryableError(err: Error): boolean {
  return /quota|exceeded|exhaust|too short|provider|unsupported/i.test(err.message);
}

// ====== 导出函数 ======

// 用 OpenClaw 配置的模型 + fallback 生成文章
export async function generateArticle(topic: string): Promise<string> {
  if (!API_KEY) throw new Error('MODELSCOPE_API_KEY not configured');

  const userPrompt = `写一篇关于"${topic}"的深度文章。严格遵循排版格式要求。`;

  // 试主模型 + 所有备选
  for (const model of [OC_MODELS.primary, ...OC_MODELS.fallbacks]) {
    try {
      console.log(`[LLM] Generate: ${model}`);
      return await callLLM(model, ARTICLE_SYSTEM_PROMPT, userPrompt);
    } catch (e: any) {
      if (isRetryableError(e)) {
        console.log(`[LLM] ${model} failed: ${e.message}`);
        continue;
      }
      throw e;
    }
  }
  throw new Error('All models exhausted');
}

// Humanizer: 去除 AI 味
export async function humanizeArticle(rawHtml: string): Promise<string> {
  if (!API_KEY) return rawHtml;

  const userPrompt = `润色以下文章，去掉 AI 写作痕迹：\n\n${rawHtml}`;

  for (const model of [OC_MODELS.primary, ...OC_MODELS.fallbacks]) {
    try {
      console.log(`[LLM] Humanizer: ${model}`);
      const result = await callLLM(model, HUMANIZER_PROMPT, userPrompt);
      return result;
    } catch (e: any) {
      if (isRetryableError(e)) {
        console.log(`[Humanizer] ${model} failed: ${e.message}`);
        continue;
      }
      return rawHtml; // 失败则返回原文
    }
  }
  return rawHtml;
}

// Visual 描述
export async function generateVisualDescription(topic: string, articleContent: string): Promise<string> {
  if (!API_KEY) return `<h3>🎨 配图方案</h3>`;

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
