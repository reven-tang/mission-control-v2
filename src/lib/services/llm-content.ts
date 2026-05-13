// LLM Content Generation Service
// 优先走 OpenClaw 本地 blockrun 代理（统一路由 159 个模型）
// Fallback 到 ModelScope 直连

import fs from 'fs';
import os from 'os';
import { join } from 'path';

// ====== 配置 ======
const BLOCKRUN_URL = 'http://127.0.0.1:8402/v1';  // OpenClaw 本地代理
const BLOCKRUN_KEY = 'x402-proxy-handles-auth';    // 固定密钥
const FALLBACK_URL = 'https://api-inference.modelscope.cn/v1';

function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
      for (const line of lines) {
        const m = line.match(/^([A-Z_]+)=(.+)/);
        if (m) process.env[m[1]] = m[2];
      }
    }
  } catch { /* ignore */ }
}
loadEnv();

const FALLBACK_KEY = process.env.MODELSCOPE_API_KEY || '';

function isBlockrunReady(): boolean {
  try {
    const cfg = JSON.parse(
      fs.readFileSync(join(os.homedir(), '.openclaw', 'openclaw.json'), 'utf-8')
    );
    const m = cfg?.agents?.defaults?.model;
    return !!m?.primary;
  } catch { return false; }
}

// ====== System Prompts ======
const ARTICLE_SYSTEM_PROMPT = `你是资深自媒体写手，擅长"有理有据+引人深思"的写作风格。

写作要求：
**内容结构**
1. 开头引言：用一句点题的话或数据做引子
2. 章节标题：用 "01" "02" "03" 居中数字标题
3. 每个章节：2-4个分段
4. 结尾升华：从数据上升到哲学层面

**排版格式**
1. 段落：<p style="line-height:2;margin-bottom:1em;">
2. 重点：<strong style="color:#FF6B00;">橙色加粗</strong>
3. 章节：<h2 style="text-align:center;color:#FF6B00;font-size:24px;margin:2em 0 0.5em;">01</h2>
4. 小标题：<h3 style="line-height:1.8;margin:1.2em 0 0.6em;">
5. 引用：<blockquote style="background:#f5f5f5;border-left:3px solid #FF6B00;padding:15px;margin:20px 0;line-height:2;">

**要求**
1. 真实数据开头
2. 字数：1500-3000字
直接输出HTML，不要外层标签，不要markdown包裹。`;

const HUMANIZER_PROMPT = `你是文章润色专家。对下面这篇文章做 humanize 处理，去掉 AI 写作痕迹：
删除"首先/其次/最后/此外/然而/因此"等连接词
拆除"研究表明/据数据/专家指出"等模糊归属
精简膨胀形容词
拆短复合句，多用短句
加入口语化表达
保持格式不变。直接输出HTML，不要解释。`;

// ====== 核心调用 ======
async function callLLM(model: string, systemPrompt: string, userPrompt: string, maxRetries = 3): Promise<string> {
  const useBlockrun = isBlockrunReady();
  const baseUrl = useBlockrun ? BLOCKRUN_URL : FALLBACK_URL;
  const apiKey = useBlockrun ? BLOCKRUN_KEY : FALLBACK_KEY;
  const actualModel = model.includes('/') ? model.split('/').pop()! : model;

  if (!apiKey) throw new Error('No LLM API key available (set MODELSCOPE_API_KEY or configure OpenClaw agent model)');

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[LLM] ${useBlockrun ? 'blockrun' : 'fallback'} | ${actualModel} | attempt ${attempt + 1}`);
      const body = {
        model: actualModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 6000,
        temperature: 0.85,
      };

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      });

      const data = await res.json() as any;
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

      let content = data.choices?.[0]?.message?.content || '';
      if (content.length < 50) throw new Error('LLM content too short');

      const cnChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
      const looksLikeError = /sorry|cannot assist|cannot fulfill|exceeded|quota|not supported/i.test(content);
      if (cnChars < 30 || looksLikeError) throw new Error('LLM quality check failed');

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
  return /quota|exceeded|exhaust|timeout|abort/i.test(err.message);
}

// ====== 导出 ======
export async function generateArticle(topic: string): Promise<string> {
  const models = ['moonshotai/Kimi-K2.6', 'MiniMax/MiniMax-M2.7', 'ZhipuAI/GLM-5'];
  for (const model of models) {
    try {
      console.log(`[LLM] Generate: ${model}`);
      return await callLLM(model, ARTICLE_SYSTEM_PROMPT, `写一篇关于"${topic}"的深度文章。`);
    } catch (e: any) {
      if (isRetryableError(e)) { console.log(`[LLM] ${model} failed`); continue; }
      throw e;
    }
  }
  throw new Error('All models exhausted');
}

export async function humanizeArticle(rawHtml: string): Promise<string> {
  const models = ['moonshotai/Kimi-K2.6'];
  for (const model of models) {
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
    return await callLLM('moonshotai/Kimi-K2.6', '你是视觉设计师。输出HTML格式配图方案。', `主题：${topic}\n摘要：${articleContent.slice(0, 200)}`);
  } catch {
    return `<h3>🎨 配图方案</h3><p>为"${topic}"生成。</p>`;
  }
}
