import { NextRequest, NextResponse } from 'next/server';
import { buildProviderMap, resolveProvider } from '@/lib/services/llm-content';

export async function GET() {
  const map = buildProviderMap();
  // 用新模型列表
  const models = ['MiniMax/MiniMax-M2.7', 'deepseek-ai/DeepSeek-V3.2', 'deepseek-ai/DeepSeek-V4-Flash'];
  const results: Record<string, any> = {};
  
  for (const m of models) {
    const prov = resolveProvider(m);
    results[m] = prov ? {
      provider: prov.provider,
      baseUrl: prov.baseUrl,
      hasKey: !!prov.apiKey,
      keyPreview: prov.apiKey ? prov.apiKey.slice(0,12) + '...' : 'EMPTY'
    } : null;
  }
  
  // 实际调用测试
  const testModel = 'MiniMax/MiniMax-M2.7';
  const prov = resolveProvider(testModel);
  let llmTest = { success: false, error: '', response: '' };
  
  if (prov && prov.apiKey) {
    try {
      const res = await fetch(`${prov.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${prov.apiKey}` },
        body: JSON.stringify({
          model: testModel,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 10
        }),
        signal: AbortSignal.timeout(30000)
      });
      const data = await res.json();
      llmTest = {
        success: !data.error,
        error: data.error?.message || '',
        response: data.choices?.[0]?.message?.content?.slice(0,50) || JSON.stringify(data).slice(0,100)
      };
    } catch (e: any) {
      llmTest.error = e.message;
    }
  }
  
  return NextResponse.json({ mapSize: map.size, resolved: results, llmTest });
}
