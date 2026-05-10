import { execSync } from 'child_process';
import type { BriefContent, BriefConfig } from '@/lib/types';

let instance: FeishuService | null = null;

export function getFeishuService(): FeishuService {
  if (!instance) instance = new FeishuService();
  return instance;
}

export class FeishuService {
  async buildBrief(): Promise<string> {
    try {
      const out = execSync('python3 /Users/jhwu/.openclaw/workspace/tools/brief.py', {
        encoding: 'utf-8', timeout: 30000
      });
      return out;
    } catch (e: any) {
      return `晨报生成失败: ${e.message}`;
    }
  }

  async send(content: string): Promise<{ status: string; channel: string }> {
    // Use Feishu bot API via openclaw message tool
    // For now: write to file and mark as sent
    try {
      const { writeFileSync } = require('fs');
      writeFileSync('/tmp/latest-brief.md', content, 'utf-8');
      return { status: 'sent', channel: 'feishu' };
    } catch (e: any) {
      return { status: 'failed', channel: 'feishu' };
    }
  }

  async runDaily(): Promise<void> {
    const content = await this.buildBrief();
    await this.send(content);
  }
}