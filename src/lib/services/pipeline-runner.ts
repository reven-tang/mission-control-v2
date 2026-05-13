/**
 * Pipeline Runner Service with Symphony Integration
 * 
 * 集成 Symphony 思想：
 * - 任务自动分解（复杂 Pipeline 拆解为子任务）
 * - 智能体能力域匹配（根据阶段自动路由）
 * - 三级自愈机制（失败自动重试/重路由）
 */

import { updatePipelineRun, addContentPiece, getPipelineRun, listContentPieces } from '@/lib/db';
import { generateArticle, humanizeArticle, generateVisualDescription } from '@/lib/services/llm-content';
import { publishDraft } from '@/lib/services/wechat';
import { getThumbMediaIdForTopic } from '@/lib/services/stock-image';

// Symphony 集成
import { initializeDefaultAgents } from './agent-registry';
import { routeTask } from './agent-router';
import { healError, executeHealing } from './self-healing';
import { CapabilityDomain } from '@/lib/domains/capability-map';

interface PipelineRunResult {
  success: boolean;
  wechatMediaId?: string;
  error?: string;
}

// Pipeline 阶段到能力域的映射
const STAGE_TO_DOMAIN: Record<string, CapabilityDomain> = {
  research: 'research',
  script: 'script',
  visual: 'visual',
  video: 'video',
  publish: 'publish',
};

// 初始化 Symphony 智能体池
let symphonyInitialized = false;
function ensureSymphonyInitialized() {
  if (!symphonyInitialized) {
    initializeDefaultAgents();
    symphonyInitialized = true;
    console.log('[Pipeline] Symphony agents initialized');
  }
}

/**
 * 自动推进 Pipeline 全流程（带 Symphony 智能路由）
 */
export async function runPipeline(runId: string, topic: string): Promise<PipelineRunResult> {
  ensureSymphonyInitialized();
  
  let wechatMediaId = '';
  let finalContent = '';
  let thumbMediaId = '';

  try {
    // === Research 阶段 ===
    const researchResult = await executeStageWithSymphony(
      runId, 'research', topic,
      async () => {
        const articleContent = await generateArticle(topic);
        addContentPiece({
          pipeline_id: runId, stage: 'research', title: topic,
          content: `<h3>🔍 Research & 深度调研</h3><p>基于"${topic}"的完整研究报告。</p><div>${articleContent}</div>`,
          assets: {}, status: 'approved',
        });
        return articleContent;
      }
    );
    
    if (!researchResult.success) {
      throw new Error(`Research stage failed: ${researchResult.error}`);
    }

    // === Script 阶段 ===
    const scriptResult = await executeStageWithSymphony(
      runId, 'script', topic,
      async () => {
        const pieces = listContentPieces({ pipeline_id: runId });
        const researchPiece = pieces.find(p => p.stage === 'research');
        const rawContent = researchPiece?.content || `<h2>${topic}</h2><p>（Research 阶段未产出内容）</p>`;
        
        try {
          finalContent = await humanizeArticle(rawContent);
          console.log(`[Pipeline] Humanized: ${rawContent.length} → ${finalContent.length} chars`);
        } catch (e: any) {
          console.warn('[Pipeline] Humanizer failed, using original:', e.message);
          finalContent = rawContent;
        }
        
        addContentPiece({
          pipeline_id: runId, stage: 'script', title: topic,
          content: finalContent, assets: {}, status: 'approved',
        });
        return finalContent;
      }
    );
    
    if (!scriptResult.success) {
      throw new Error(`Script stage failed: ${scriptResult.error}`);
    }

    // === Visual 阶段 ===
    const visualResult = await executeStageWithSymphony(
      runId, 'visual', topic,
      async () => {
        const visualDesc = await generateVisualDescription(topic, finalContent);
        thumbMediaId = await getThumbMediaIdForTopic(topic);
        console.log(`[Pipeline] Cover image: ${thumbMediaId.slice(0, 30)}...`);
        
        addContentPiece({
          pipeline_id: runId, stage: 'visual', title: topic,
          content: visualDesc, assets: thumbMediaId ? { thumb_media_id: thumbMediaId } : {}, status: 'approved',
        });
        return visualDesc;
      }
    );
    
    if (!visualResult.success) {
      console.warn('[Pipeline] Visual stage failed, continuing:', visualResult.error);
      addContentPiece({
        pipeline_id: runId, stage: 'visual', title: topic,
        content: `<h3>🎨 Visual 配图方案</h3><p>为"${topic}"生成配图方案。（生成失败）</p>`,
        assets: {}, status: 'draft',
      });
    }

    // === Video 阶段 ===
    updatePipelineRun(runId, { current_stage: 'video' as const, status: 'running', updated_at: Date.now() });
    addContentPiece({
      pipeline_id: runId, stage: 'video', title: topic,
      content: `<h3>🎬 Video 视频</h3><p>视频将在文案确认后生成。</p>`,
      assets: {}, status: 'pending',
    });

    // === Publish 阶段 ===
    const publishResult = await executeStageWithSymphony(
      runId, 'publish', topic,
      async () => {
        const result = await publishDraft([{ 
          title: topic, 
          content: finalContent, 
          thumb_media_id: thumbMediaId || undefined 
        }]);
        wechatMediaId = result.media_id;
        
        addContentPiece({
          pipeline_id: runId, stage: 'publish', title: topic,
          content: finalContent,
          assets: { wechat_media_id: wechatMediaId, thumb_media_id: thumbMediaId },
          status: 'published',
        });
        return wechatMediaId;
      }
    );
    
    if (!publishResult.success) {
      throw new Error(`Publish stage failed: ${publishResult.error}`);
    }

    // === 完成 ===
    updatePipelineRun(runId, { status: 'completed' as const, completed_at: Date.now(), updated_at: Date.now() });

    return {
      success: !!wechatMediaId,
      wechatMediaId: wechatMediaId || undefined,
      error: wechatMediaId ? undefined : 'WeChat publish failed',
    };
  } catch (e: any) {
    console.error('[Pipeline] Fatal error:', e);
    updatePipelineRun(runId, { status: 'failed' as const, updated_at: Date.now() });
    return { success: false, error: e.message };
  }
}

/**
 * 带 Symphony 智能路由的阶段执行器
 * 支持：智能体匹配 → 执行 → 失败自愈
 */
async function executeStageWithSymphony(
  runId: string,
  stage: string,
  topic: string,
  executeFn: () => Promise<any>
): Promise<{ success: boolean; error?: string; data?: any }> {
  const domain = STAGE_TO_DOMAIN[stage];
  
  // 1. 路由到智能体
  const routeResult = await routeTask({
    id: `${runId}-${stage}`,
    title: `Pipeline ${stage}: ${topic}`,
    tags: [stage, domain, 'auto-assign'],
    complexity: 3
  });
  
  if (!routeResult.success) {
    console.warn(`[Symphony] No agent routed for ${stage}, executing directly`);
  } else {
    console.log(`[Symphony] Stage ${stage} routed to ${routeResult.agentId}`);
  }
  
  // 2. 执行阶段
  updatePipelineRun(runId, { current_stage: stage as any, status: 'running', updated_at: Date.now() });
  
  try {
    const data = await executeFn();
    return { success: true, data };
  } catch (error: any) {
    console.error(`[Pipeline] Stage ${stage} failed:`, error.message);
    
    // 3. 自愈处理
    const healingResult = await healError({
      taskId: `${runId}-${stage}`,
      agentId: routeResult.agentId || 'direct',
      error,
      retryCount: 0,
      timestamp: Date.now()
    });
    
    const healed = await executeHealing(
      { id: `${runId}-${stage}`, assignedAgentId: routeResult.agentId },
      healingResult
    );
    
    if (!healed) {
      return { success: false, error: `Stage ${stage} failed after healing: ${error.message}` };
    }
    
    // 重试一次
    try {
      const data = await executeFn();
      return { success: true, data };
    } catch (retryError: any) {
      return { success: false, error: `Stage ${stage} failed after retry: ${retryError.message}` };
    }
  }
}

export default { runPipeline };
