import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const DB_DIR = join(process.cwd(), 'data');
const DB_PATH = join(DB_DIR, 'mc.db');

function initDb() {
  // Ensure data directory exists
  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true });
  }

  const db = new Database(DB_PATH);

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  // Create tables
  db.exec(`
    -- 任务看板 (5 状态)
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'backlog'
        CHECK(status IN ('backlog', 'todo', 'in_progress', 'review', 'done')),
      priority INTEGER DEFAULT 0 CHECK(priority BETWEEN 0 AND 4),
      source TEXT DEFAULT 'manual' CHECK(source IN ('manual', 'autonomous', 'brain-dump')),
      goal_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      completed_at INTEGER,
      assigned_agent TEXT,
      tags TEXT DEFAULT '[]'
    );

    -- FTS5 记忆全文索引
    CREATE VIRTUAL TABLE IF NOT EXISTS memories USING fts5(
      title,
      content,
      source,
      tags,
      tokenize='porter unicode61'
    );

    -- 记忆元数据
    CREATE TABLE IF NOT EXISTS memories_meta (
      id TEXT PRIMARY KEY,
      file_path TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      size_bytes INTEGER DEFAULT 0
    );

    -- 晨报配置
    CREATE TABLE IF NOT EXISTS brief_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      modules TEXT DEFAULT '["news","tasks","health","insights"]',
      delivery_time TEXT DEFAULT '09:30',
      delivery_channel TEXT DEFAULT 'feishu',
      enabled INTEGER DEFAULT 1
    );

    -- 晨报历史
    CREATE TABLE IF NOT EXISTS brief_history (
      id TEXT PRIMARY KEY,
      sent_at INTEGER NOT NULL,
      content TEXT NOT NULL,
      channel TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('sent', 'failed', 'draft'))
    );

    -- 健康检查历史
    CREATE TABLE IF NOT EXISTS healthcheck_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ran_at INTEGER NOT NULL,
      result TEXT NOT NULL,
      issues_found INTEGER DEFAULT 0,
      auto_fixed INTEGER DEFAULT 0
    );

    -- Agent 活动日志
    CREATE TABLE IF NOT EXISTS agent_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL,
      event_type TEXT NOT NULL
        CHECK(event_type IN ('task_start', 'task_complete', 'error', 'heartbeat')),
      detail TEXT,
      recorded_at INTEGER NOT NULL
    );

    -- Token 消耗追踪
    CREATE TABLE IF NOT EXISTS tokens_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_tokens INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      estimated_cost REAL DEFAULT 0.0
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at);
    CREATE INDEX IF NOT EXISTS idx_memories_updated ON memories_meta(updated_at);
    CREATE INDEX IF NOT EXISTS idx_agent_activity_agent ON agent_activity(agent_id);
    CREATE INDEX IF NOT EXISTS idx_tokens_usage_date ON tokens_usage(date);
  `);

  console.log(`✅ Database initialized at ${DB_PATH}`);
  return db;
}

if (require.main === module) {
  initDb();
}

export { initDb };
