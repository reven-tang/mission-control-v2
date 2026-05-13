import { z } from 'zod';

// ─── Research / Pain Points ───
export const ImportPainPointSchema = z.object({
  items: z.array(z.object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(2000),
    source: z.string().min(1).max(100),
    source_url: z.string().url().optional().or(z.literal('')),
    engagement: z.object({
      upvotes: z.number().int().nonnegative().optional(),
      comments: z.number().int().nonnegative().optional(),
      score: z.number().optional(),
    }).optional(),
    tags: z.array(z.string()).max(10).optional(),
    severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  })).min(1).max(100),
});

export const UpdatePainPointSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  status: z.enum(['discovered', 'validated', 'shipped']).optional(),
  tags: z.array(z.string()).max(10).optional(),
});

// ─── Opportunities ───
export const CreateOpportunitySchema = z.object({
  pain_point_ids: z.array(z.string().uuid()).min(1).max(50),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  score: z.number().min(0).max(100).optional(),
  mvp_task_title: z.string().max(200).optional(),
});

export const UpdateOpportunitySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  score: z.number().min(0).max(100).optional(),
  status: z.enum(['idea', 'building', 'shipped']).optional(),
  mvp_task_title: z.string().max(200).optional(),
});

// ─── Pipeline ───
export const CreatePipelineRunSchema = z.object({
  title: z.string().min(1).max(200),
  topic: z.string().min(1).max(200),
  metadata: z.record(z.any()).optional(),
});

export const AdvanceStageSchema = z.object({
  action: z.enum(['advance', 'set']).optional().default('advance'),
  stage: z.enum(['research', 'script', 'visual', 'publish']).optional(),
  content: z.string().max(10000).optional(),
  assets: z.record(z.any()).optional(),
});

// ─── Tasks / Stories ───
export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: z.number().int().min(0).max(4).optional(),
  source: z.enum(['manual', 'autonomous', 'brain-dump']).optional(),
  goal_id: z.string().uuid().optional().or(z.literal('')),
  tags: z.array(z.string()).max(20).optional(),
});

export const UpdateTaskStatusSchema = z.object({
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']),
});

// ─── Cost ───
export const ReportCostSchema = z.object({
  session_id: z.string().min(1).optional(),
  agent_name: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  provider: z.string().min(1).optional(),
  input_tokens: z.number().int().nonnegative().optional(),
  output_tokens: z.number().int().nonnegative().optional(),
  total_tokens: z.number().int().nonnegative().optional(),
  cost_usd: z.number().nonnegative().optional(),
});

// ─── Publish / WeChat ───
export const PublishDraftSchema = z.object({
  pipeline_id: z.string().min(1).optional(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(20000).optional(),
  digest: z.string().max(500).optional(),
  thumb_url: z.string().url().optional().or(z.literal('')),
});

// ─── Pipeline publish ───
export const PublishPipelineSchema = z.object({
  thumb_media_id: z.string().min(1).optional(),
});

// ─── Generic helpers ───
export function validateOrRespond<T>(schema: z.ZodSchema<T>, body: unknown) {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { ok: false as const, error: result.error.errors[0]?.message || 'Invalid input' };
  }
  return { ok: true as const, data: result.data };
}
