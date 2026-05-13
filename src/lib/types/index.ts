// Research / Pain Point types
/**
 * Severity level: how many people are affected and how urgently.
 */
export type PainSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Current stage of a pain point in the research pipeline.
 */
export type PainStatus = 'discovered' | 'validated' | 'shipped';

/**
 * A single pain point extracted from real user feedback.
 * Source data flows from last30days research → MC store.
 */
export interface PainPoint {
  id: string;
  title: string;
  description: string;
  severity: PainSeverity;
  source: string; // e.g. "Reddit" or "r/AI_Agents"
  source_url: string;
  engagement: { upvotes?: number; comments?: number; score?: number };
  tags: string[];
  discovered_at: number;
  status: PainStatus;
}

/**
 * A product opportunity derived from one or more pain points.
 */
export interface Opportunity {
  id: string;
  pain_point_ids: string[];
  title: string;
  description: string;
  score: number; // 0–100 opportunity score
  mvp_task_title: string; // suggested title for the build task
  created_at: number;
  status: 'idea' | 'building' | 'shipped';
}

// --- existing types below ---

// Task types
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 0 | 1 | 2 | 3 | 4; // none/low/med/high/urgent
export type TaskSource = 'manual' | 'autonomous' | 'brain-dump';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  source: TaskSource;
  goal_id?: string;
  created_at: number;
  updated_at: number;
  completed_at?: number;
  assigned_agent?: string;
  tags: string[]; // JSON array parsed
  artifacts?: Artifact[]; // 产出物链接
}

export interface Artifact {
  name: string;
  type: 'file' | 'url' | 'api';
  path?: string;
  url?: string;
  description?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  source?: TaskSource;
  goal_id?: string;
  tags?: string[];
}

// Memory types
export type MemorySource = 'conversation' | 'note' | 'link' | 'todo';

export interface Memory {
  id: string;
  title: string;
  content: string;
  source: MemorySource;
  tags: string[];
  file_path: string;
  created_at: number;
  updated_at: number;
  size_bytes: number;
}

export interface MemoryResult {
  id: string;
  title: string;
  content: string;
  source: MemorySource;
  tags: string[];
  score?: number;
  file_path?: string;
}

export interface SearchFilters {
  source?: MemorySource;
  date_from?: number;
  date_to?: number;
  tags?: string[];
}

// Brief types
export interface BriefConfig {
  id: number;
  modules: string[];
  delivery_time: string;
  delivery_channel: string;
  enabled: boolean;
}

export interface BriefContent {
  yesterday_review: string;
  today_tasks: Task[];
  ai_suggestion: string;
  daily_quote: string;
}

// Agent types
export interface AgentSession {
  id: string;
  name: string;
  status: 'running' | 'idle' | 'offline';
  task?: string;
  started_at?: number;
}

// Healthcheck types
export interface HealthcheckResult {
  compile: { passed: boolean; detail: string };
  sync: { passed: boolean; detail: string };
  lint: { passed: boolean; detail: string };
  search: { passed: boolean; detail: string };
  index: { passed: boolean; detail: string };
  overall_score: number;
  issues_found: number;
  auto_fixed: number;
}

// System types
export interface SystemStats {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  uptime: number;
}

// Skills types
export interface SkillStats {
  total_skills: number;
  graph_density: number;
  nodes: number;
  edges: number;
  excellent: number;
  good: number;
  fair: number;
  poor: number;
}

// SSE Event types
export type MCEEvent =
  | { type: 'task_created'; task: Task }
  | { type: 'task_updated'; task: Task }
  | { type: 'task_moved'; taskId: string; from: TaskStatus; to: TaskStatus }
  | { type: 'agent_status'; agents: AgentSession[] }
  | { type: 'healthcheck_complete'; result: HealthcheckResult }
  | { type: 'file_changed'; path: string; event: 'add' | 'change' | 'unlink' }
  | { type: 'brief_sent'; result: { status: string; channel: string } };

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// ─── Pipeline / Content Factory Types ───

export type PipelineStage = 'research' | 'script' | 'visual' | 'video' | 'publish';
export type PipelineStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed';

export interface PipelineRun {
  id: string;
  title: string;
  topic: string;
  current_stage: PipelineStage;
  status: PipelineStatus;
  created_at: number;
  updated_at: number;
  completed_at?: number;
  quill_agent_id?: string;
  pixel_agent_id?: string;
  metadata: {
    keywords?: string[];
    target_platforms?: string[];
    seo_score?: number;
  };
}

export interface ContentPiece {
  id: string;
  pipeline_id: string;
  stage: PipelineStage;
  title: string;
  content: string;
  assets: {
    images?: string[];
    thumbnails?: string[];
    banners?: string[];
    thumb_media_id?: string;
    wechat_media_id?: string;
    video_path?: string;
    video_html?: string;
    error?: string;
  };
  status: string;
  created_at: number;
  updated_at: number;
  published_at?: number;
  platform_data?: Record<string, {
    url?: string;
    views?: number;
    likes?: number;
    shares?: number;
  }>;
}

export interface QuillResearchResult {
  topic: string;
  keywords: string[];
  trends: { keyword: string; volume: number; growth: number }[];
  competitors: { title: string; url: string; engagement: number }[];
  outline: { section: string; points: string[] }[];
  seo_recommendations: string[];
}

export interface PixelVisualResult {
  thumbnails: { url: string; variant: 'A' | 'B' | 'C' }[];
  banners: { url: string; size: string; platform: string }[];
  brand_assets: { url: string; type: string }[];
}


// ─── AI Agent Cost Tracker Types ───

export interface CostEntry {
  id: string;
  session_id: string;
  agent_name: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  created_at: number;
  metadata?: Record<string, string>;
}

export interface CostSummary {
  total_cost_usd: number;
  total_tokens: number;
  by_agent: Record<string, { cost: number; tokens: number; sessions: number }>;
  by_model: Record<string, { cost: number; tokens: number }>;
  by_day: Record<string, { cost: number; tokens: number }>;
  top_expensive_sessions: CostEntry[];
}
