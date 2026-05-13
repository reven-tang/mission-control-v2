import { execSync } from 'child_process';
import type { SystemStats } from '@/lib/types';

let instance: SystemService | null = null;

export function getSystemService(): SystemService {
  if (!instance) instance = new SystemService();
  return instance;
}

export class SystemService {
  async getStats(): Promise<SystemStats> {
    try {
      const cpu = this.getCpuUsage();
      const mem = this.getMemoryUsage();
      const disk = this.getDiskUsage();
      return {
        cpu_usage: cpu,
        memory_usage: mem,
        disk_usage: disk,
        uptime: process.uptime(),
      };
    } catch {
      return { cpu_usage: 0, memory_usage: 0, disk_usage: 0, uptime: 0 };
    }
  }

  private getCpuUsage(): number {
    try {
      // Simple cross-platform CPU check
      const cpus = require('os').cpus();
      if (!cpus.length) return 0;
      let totalIdle = 0, totalTick = 0;
      for (const c of cpus) {
        for (const type in c.times) totalTick += c.times[type];
        totalIdle += c.times.idle;
      }
      return Math.round(((totalTick - totalIdle) / totalTick) * 100);
    } catch { return 0; }
  }

  private getMemoryUsage(): number {
    try {
      const total = require('os').totalmem();
      const free = require('os').freemem();
      return Math.round(((total - free) / total) * 100);
    } catch { return 0; }
  }

  private getDiskUsage(): number {
    try {
      // Use spawnSync with args array to avoid shell injection
      const { spawnSync } = require('child_process');
      const res = spawnSync('df', [process.cwd()], { encoding: 'utf-8', timeout: 5000 });
      if (res.error) throw res.error;
      const lines = res.stdout.trim().split('\n');
      const dataLine = lines[lines.length - 1];
      const parts = dataLine.split(/\s+/);
      return parseInt(parts[4]) || 0;
    } catch { return 0; }
  }
}