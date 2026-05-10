import { join } from 'path';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import type { MemoryResult, SearchFilters } from '@/lib/types';

const WORKSPACE_DIR = join(process.cwd(), '..', '..');
const MEMORY_DIR = join(WORKSPACE_DIR, 'memory');

let instance: MemoryService | null = null;

export function getMemoryService(): MemoryService {
  if (!instance) instance = new MemoryService();
  return instance;
}

export class MemoryService {
  async scan(): Promise<MemoryResult[]> {
    const results: MemoryResult[] = [];
    if (!existsSync(MEMORY_DIR)) return results;
    const files = this.walkDir(MEMORY_DIR, 3);
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      try {
        const content = readFileSync(file, 'utf-8');
        const title = this.extractTitle(content) || file.split('/').pop() || file;
        results.push({
          id: Buffer.from(file).toString('base64'),
          title,
          content: content.slice(0, 3000),
          source: 'conversation',
          tags: this.extractTags(content),
        });
      } catch {}
    }
    return results;
  }

  async search(query: string, filters?: SearchFilters): Promise<MemoryResult[]> {
    const all = await this.scan();
    const lower = query.toLowerCase();
    let results = all
      .filter(m => m.title.toLowerCase().includes(lower) || m.content.toLowerCase().includes(lower))
      .map(m => ({ ...m, score: this.score(m, lower) }))
      .sort((a, b) => (b.score || 0) - (a.score || 0));
    if (filters?.tags?.length) results = results.filter(m => filters.tags!.some(t => m.tags.includes(t)));
    return results.slice(0, 20);
  }

  async recent(limit = 10): Promise<MemoryResult[]> {
    const all = await this.scan();
    return all.slice(-limit).reverse();
  }

  private walkDir(dir: string, depth: number): string[] {
    if (depth <= 0) return [];
    const files: string[] = [];
    try {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
          files.push(...this.walkDir(p, depth - 1));
        } else if (e.isFile()) {
          files.push(p);
        }
      }
    } catch {}
    return files;
  }

  private extractTitle(content: string): string {
    const m = content.match(/^#\s+(.+)/m);
    return m ? m[1].trim() : '';
  }

  private extractTags(content: string): string[] {
    const m = content.match(/tags?:?\s*\[(.+?)\]/i);
    if (!m) return [];
    return m[1].split(',').map(t => t.trim().replace(/[\[\]']/g, ''));
  }

  private score(m: MemoryResult, q: string): number {
    let s = 0;
    if (m.title.toLowerCase().includes(q)) s += 10;
    s += ((m.content.toLowerCase().match(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length) * 2;
    return s;
  }
}