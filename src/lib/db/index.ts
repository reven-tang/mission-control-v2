// JSON file store with basic concurrency control
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import type { Task, CreateTaskInput, PainPoint, Opportunity, ContentPiece, PipelineRun } from '@/lib/types';

const DATA_DIR = join(process.cwd(), 'data');
const STORE_PATH = join(DATA_DIR, 'mc-store.json');

// Simple in-memory lock for sequential access (Node.js single-threaded)
let writeLock: Promise<void> = Promise.resolve();

interface StoreSchema {
  pipeline_runs: PipelineRun[];
  content_pieces: ContentPiece[];
  tasks: Task[];
  brief_config: any;
  brief_history: any[];
  healthcheck_history: any[];
  agent_activity: any[];
  token_usage: any[];
  pain_points: PainPoint[];
  opportunities: Opportunity[];
}

let store: StoreSchema | null = null;

function load(): StoreSchema {
  if (store) return store;
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (existsSync(STORE_PATH)) {
    const raw: StoreSchema = JSON.parse(readFileSync(STORE_PATH, 'utf-8'));
    // Ensure new fields exist in existing stores
    raw.tasks = raw.tasks || [];
    raw.pipeline_runs = raw.pipeline_runs || [];
    raw.content_pieces = raw.content_pieces || [];
    store = raw;
  } else {
    store = { tasks: [], pipeline_runs: [], content_pieces: [], brief_config: { id: 1, modules: ['news','tasks','health','insights'], delivery_time: '09:30', delivery_channel: 'feishu', enabled: true }, brief_history: [], healthcheck_history: [], agent_activity: [], token_usage: [], pain_points: [], opportunities: [] };
    save();
  }
  return store;
}

// Synchronized save to prevent concurrent writes
async function saveAsync(): Promise<void> {
  if (!store) return;
  const prev = writeLock;
  let resolveLock: () => void;
  writeLock = new Promise(resolve => { resolveLock = resolve; });
  await prev;
  try {
    writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } finally {
    resolveLock!();
  }
}

// Legacy sync version for backward compatibility
function save(): void {
  if (!store) return;
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

export function getStore(): StoreSchema { return load(); }

export async function createTaskAsync(input: CreateTaskInput): Promise<Task> {
  const prev = writeLock;
  let resolveLock: () => void;
  writeLock = new Promise(resolve => { resolveLock = resolve; });
  await prev;
  try {
    const s = load();
    const now = Date.now();
    const id = `task_${now}_${Math.random().toString(36).slice(2, 8)}`;
    const task: Task = { id, title: input.title, description: input.description || '', status: 'backlog', priority: input.priority || 0, source: input.source || 'manual', goal_id: input.goal_id, created_at: now, updated_at: now, tags: input.tags || [] };
    s.tasks.push(task);
    save();
    return task;
  } finally {
    resolveLock!();
  }
}

export function createTask(input: CreateTaskInput): Task {
  const s = load();
  const now = Date.now();
  const id = `task_${now}_${Math.random().toString(36).slice(2, 8)}`;
  const task: Task = { id, title: input.title, description: input.description || '', status: 'backlog', priority: input.priority || 0, source: input.source || 'manual', goal_id: input.goal_id, created_at: now, updated_at: now, tags: input.tags || [] };
  s.tasks.push(task);
  save();
  return task;
}

export function deleteTask(id: string): boolean {
  const s = load();
  const before = s.tasks.length;
  s.tasks = s.tasks.filter((t: Task) => t.id !== id);
  if (s.tasks.length < before) { save(); return true; }
  return false;
}

export function getTask(id: string): Task | null {
  return load().tasks.find(t => t.id === id) || null;
}

export async function updateTaskAsync(id: string, changes: Partial<Task>): Promise<Task> {
  const prev = writeLock;
  let resolveLock: () => void;
  writeLock = new Promise(resolve => { resolveLock = resolve; });
  await prev;
  try {
    const s = load();
    const idx = s.tasks.findIndex(t => t.id === id);
    if (idx === -1) throw new Error(`Task not found: ${id}`);
    const t = s.tasks[idx];
    for (const [k, v] of Object.entries(changes)) {
      if (k === 'id' || k === 'created_at') continue;
      (t as any)[k] = v;
      if (k === 'status' && v === 'done') t.completed_at = Date.now();
    }
    t.updated_at = Date.now();
    save();
    return t;
  } finally {
    resolveLock!();
  }
}

export function updateTask(id: string, changes: Partial<Task>): Task {
  const s = load();
  const idx = s.tasks.findIndex(t => t.id === id);
  if (idx === -1) throw new Error(`Task not found: ${id}`);
  const t = s.tasks[idx];
  for (const [k, v] of Object.entries(changes)) {
    if (k === 'id' || k === 'created_at') continue;
    (t as any)[k] = v;
    if (k === 'status' && v === 'done') t.completed_at = Date.now();
  }
  t.updated_at = Date.now();
  save();
  return t;
}

export function listTasks(filters?: { status?: string; priority?: number }): Task[] {
  let tasks = [...load().tasks];
  if (filters?.status) tasks = tasks.filter(t => t.status === filters.status);
  if (filters?.priority) tasks = tasks.filter(t => t.priority === filters.priority);
  return tasks.sort((a, b) => b.created_at - a.created_at);
}

export function getKanban() {
  const tasks = listTasks();
  const kanban: Record<string, Task[]> = { backlog: [], todo: [], in_progress: [], review: [], done: [] };
  for (const t of tasks) (kanban[t.status] || kanban.backlog).push(t);
  return kanban;
}

// ─── Pain Points ───

export function addPainPoint(p: Omit<PainPoint, 'id' | 'discovered_at'>): PainPoint {
  const s = load();
  const id = `pp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const pp: PainPoint = { ...p, id, discovered_at: Date.now() };
  s.pain_points.push(pp);
  save();
  return pp;
}

export function listPainPoints(): PainPoint[] {
  return [...(load().pain_points || [])].sort((a, b) => b.discovered_at - a.discovered_at);
}

export function getPainPoint(id: string): PainPoint | null {
  return (load().pain_points || []).find(p => p.id === id) || null;
}

export function updatePainPoint(id: string, changes: Partial<PainPoint>): PainPoint | null {
  const s = load();
  const idx = s.pain_points.findIndex(p => p.id === id);
  if (idx === -1) return null;
  s.pain_points[idx] = { ...s.pain_points[idx], ...changes };
  save();
  return s.pain_points[idx];
}

export function deletePainPoint(id: string): boolean {
  const s = load();
  const before = s.pain_points.length;
  s.pain_points = s.pain_points.filter(p => p.id !== id);
  if (s.pain_points.length < before) { save(); return true; }
  return false;
}

// ─── Opportunities ───

export function addOpportunity(o: Omit<Opportunity, 'id' | 'created_at'>): Opportunity {
  const s = load();
  const id = `opp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const opp: Opportunity = { ...o, id, created_at: Date.now() };
  s.opportunities.push(opp);
  save();
  return opp;
}

export function listOpportunities(): Opportunity[] {
  return [...(load().opportunities || [])].sort((a, b) => b.created_at - a.created_at);
}

export function getOpportunity(id: string): Opportunity | null {
  return (load().opportunities || []).find(o => o.id === id) || null;
}

export function updateOpportunity(id: string, changes: Partial<Opportunity>): Opportunity | null {
  const s = load();
  const idx = s.opportunities.findIndex(o => o.id === id);
  if (idx === -1) return null;
  s.opportunities[idx] = { ...s.opportunities[idx], ...changes };
  save();
  return s.opportunities[idx];
}




// ─── Pipeline Runs ───

export function addPipelineRun(p: Omit<PipelineRun, 'id' | 'created_at' | 'updated_at'>): PipelineRun {
  const s = load();
  const id = `pipeline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = Date.now();
  const run: PipelineRun = { ...p, id, created_at: now, updated_at: now };
  s.pipeline_runs.push(run);
  save();
  return run;
}

export function listPipelineRuns(): PipelineRun[] {
  return [...(load().pipeline_runs || [])].sort((a, b) => b.created_at - a.created_at);
}

export function getPipelineRun(id: string): PipelineRun | null {
  return (load().pipeline_runs || []).find(p => p.id === id) || null;
}

export async function updatePipelineRunAsync(id: string, changes: Partial<PipelineRun>): Promise<PipelineRun | null> {
  const prev = writeLock;
  let resolveLock: () => void;
  writeLock = new Promise(resolve => { resolveLock = resolve; });
  await prev;
  try {
    const s = load();
    const idx = s.pipeline_runs.findIndex(p => p.id === id);
    if (idx === -1) return null;
    s.pipeline_runs[idx] = { ...s.pipeline_runs[idx], ...changes, updated_at: Date.now() };
    save();
    return s.pipeline_runs[idx];
  } finally {
    resolveLock!();
  }
}

export function updatePipelineRun(id: string, changes: Partial<PipelineRun>): PipelineRun | null {
  const s = load();
  const idx = s.pipeline_runs.findIndex(p => p.id === id);
  if (idx === -1) return null;
  s.pipeline_runs[idx] = { ...s.pipeline_runs[idx], ...changes, updated_at: Date.now() };
  save();
  return s.pipeline_runs[idx];
}

export function deletePipelineRun(id: string): boolean {
  const s = load();
  const before = s.pipeline_runs.length;
  s.pipeline_runs = s.pipeline_runs.filter(p => p.id !== id);
  if (s.pipeline_runs.length < before) { save(); return true; }
  return false;
}

// ─── Content Pieces ───

export function addContentPiece(p: Omit<ContentPiece, 'id' | 'created_at' | 'updated_at'>): ContentPiece {
  const s = load();
  const id = `content_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = Date.now();
  const piece: ContentPiece = { ...p, id, created_at: now, updated_at: now };
  s.content_pieces.push(piece);
  save();
  return piece;
}

export function listContentPieces(filters?: { pipeline_id?: string; stage?: string }): ContentPiece[] {
  let pieces = [...(load().content_pieces || [])].sort((a, b) => b.created_at - a.created_at);
  if (filters?.pipeline_id) pieces = pieces.filter(p => p.pipeline_id === filters.pipeline_id);
  if (filters?.stage) pieces = pieces.filter(p => p.stage === filters.stage);
  return pieces;
}

export function getContentPiece(id: string): ContentPiece | null {
  return (load().content_pieces || []).find(p => p.id === id) || null;
}

export function updateContentPiece(id: string, changes: Partial<ContentPiece>): ContentPiece | null {
  const s = load();
  const idx = s.content_pieces.findIndex(p => p.id === id);
  if (idx === -1) return null;
  s.content_pieces[idx] = { ...s.content_pieces[idx], ...changes, updated_at: Date.now() };
  save();
  return s.content_pieces[idx];
}

export function deleteContentPiece(id: string): boolean {
  const s = load();
  const before = s.content_pieces.length;
  s.content_pieces = s.content_pieces.filter(p => p.id !== id);
  if (s.content_pieces.length < before) { save(); return true; }
  return false;
}
