// LLM Content Generation Service
// 调用 DeepSeek/ModelScope API 生成博人眼球的深度文章

import fs from 'fs';
import { join } from 'path';

function loadEnv(): Record<string, string> {
  const envPath = join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    return fs.readFileSync(envPath, 'utf-8')
      .split('\n').filter(l => l && !l.startsWith('#'))
      .reduce((acc, line) => { const [k, ...v] = line.split('='); acc[k.trim()] = v.join('=').trim(); return acc; }, {} as Record<string, string>);
  }
  return {};
}

const _env = loadEnv();
const API_KEY = process.env.MODELSCOPE_API_KEY || _env.MODELSCOPE_API_KEY;
const MODEL = process.env.LLM_MODEL || _env.LLM_MODEL || 'deepseek-ai/DeepSeek-V3.2';
const API_URL = 'https://api-inference.modelscope.cn/v1/chat/completions';

const SYSTEM_PROMPT = `你是一位10年经验的微信公众号爆款写手。你的文章必须：

1. **标题冲击力**：用数字、反常识、情绪词制造标题张力
2. **开头50字抓人**：第一段必须制造悬念或痛点共鸣，让读者无法划走
3. **数据支撑**：引用真实数据（年份、百分比、金额等），增强可信度
4. **犀利观点**：不说废话，每个观点都要有锋利的洞察，不能是"AI很重要"这种废话
5. **情绪共鸣**：让读者感到"说的就是我"或"原来如此"
6. **行动号召**：结尾给读者明确的下一步行动

输出格式：HTML（可直接用于微信公众号），使用 <h2>/<h3>/<p>/<ul>/<ol>/<strong> 等标签。
字数要求：800字以上。
风格：犀利、有态度、不说废话。`;

export async function generateArticle(topic: string): Promise<string> {
  if (!API_KEY) {
    throw new Error('MODELSCOPE_API_KEY not configured');
  }

  const userPrompt = `写一篇关于"${topic}"的深度文章。

要求：
- 标题必须有冲击力，用数字或反常识角度切入
- 开头50字必须制造悬念或痛点，让读者无法划走
- 用3-5个真实数据点支撑（可以引用2024-2025年的趋势数据）
- 观点犀利，不说"AI很重要"这种废话，要说"你不学AI，3年后你的岗位就不存在了"这种刺痛人的话
- 结尾有明确的行动号召
- 800字以上
- HTML格式输出`;

  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 3000,
    temperature: 0.85,
  };

  console.log(`[LLM] Generating article for: "${topic}"`);

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (data.error) {
    console.error('[LLM] Error:', data.error);
    throw new Error(`LLM generation failed: ${data.error.message || JSON.stringify(data.error)}`);
  }

  const content = data.choices?.[0]?.message?.content || '';
  console.log(`[LLM] Generated: ${content.length} chars`);

  if (content.length < 200) {
    throw new Error('LLM generated too short content');
  }

  // 清理 LLM 输出的格式包裹
  let cleaned = content;
  // 去掉 ```html ... ``` 包裹
  if (cleaned.startsWith('```html')) cleaned = cleaned.slice(7);
  if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();
  // 去掉 <!DOCTYPE html>...<body> 包裹，只保留 body 内容
  const bodyMatch = cleaned.match(/<body[^>]*>(.*?)<\/body>/s);
  if (bodyMatch) cleaned = bodyMatch[1].trim();
  // 去掉 <html>...<head>...</head> 包裹
  cleaned = cleaned.replace(/<\/?(?:html|head|body)[^>]*>/g, '').replace(/<head>.*?<\/head>/gs, '');
  // 去掉 markdown 标题标记（# 开头行）
  cleaned = cleaned.replace(/^#{1,6}\s+.*/gm, '');

  return cleaned;
}

// 生成配图描述（Visual 阶段）
export async function generateVisualDescription(topic: string, articleContent: string): Promise<string> {
  if (!API_KEY) {
    return `<h3>🎨 Visual 配图方案</h3><p>为"${topic}"生成配图方案。</p>`;
  }

  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: '你是资深视觉设计师。输出HTML格式的配图方案说明。' },
      { role: 'user', content: `为以下文章设计配图方案（封面图风格+3张正文配图建议）。文章主题：${topic}\n\n文章摘要：${articleContent.slice(0, 200)}\n\n输出：1)封面图风格描述 2)3张正文配图场景描述` },
    ],
    max_tokens: 800,
    temperature: 0.7,
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return data.choices?.[0]?.message?.content || `<h3>🎨 Visual 配图方案</h3><p>为"${topic}"生成配图方案。</p>`;
}