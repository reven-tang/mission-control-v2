import { NextRequest, NextResponse } from 'next/server';
import { decomposeComplexTask, needsDecomposition } from '@/lib/task-decomposer';
import { resolveProvider } from '@/lib/services/llm-content';

export async function POST(request: NextRequest) {
  try {
    const { title, description, tags } = await request.json();
    
    // 先测试模型解析
    const models = ['deepseek-ai/DeepSeek-V3.2', 'deepseek-ai/DeepSeek-V4-Flash'];
    const modelTests: Record<string, any> = {};
    
    for (const m of models) {
      const prov = resolveProvider(m);
      if (!prov) {
        modelTests[m] = { error: 'provider not found' };
        continue;
      }
      
      // 实际调用
      try {
        const res = await fetch(`${prov.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${prov.apiKey}` },
          body: JSON.stringify({
            model: m,
            messages: [{ role: 'user', content: 'hi' }],
            max_tokens: 10
          }),
          signal: AbortSignal.timeout(30000)
        });
        const data = await res.json();
        modelTests[m] = {
          provider: prov.provider,
          hasKey: !!prov.apiKey,
          success: !data.error,
          error: data.error?.message || '',
          response: data.choices?.[0]?.message?.content?.slice(0,20) || ''
        };
      } catch (e: any) {
        modelTests[m] = { provider: prov.provider, hasKey: !!prov.apiKey, error: e.message };
      }
    }
    
    // 测试分解
    const shouldDecompose = needsDecomposition(tags);
    let decomposeResult: any = { skipped: !shouldDecompose };
    
    if (shouldDecompose) {
      try {
        const result = await decomposeComplexTask(title, description || '', tags);
        decomposeResult = { success: true, cardsCount: result.cards.length };
      } catch (e: any) {
        decomposeResult = { success: false, error: e.message };
      }
    }
    
    return NextResponse.json({ modelTests, needsDecomposition: shouldDecompose, decomposeResult });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message });
  }
}
