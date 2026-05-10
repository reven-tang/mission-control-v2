import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFeishuService } from '../../src/lib/services/feishu';

describe('FeishuService', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('should return singleton', () => {
    expect(getFeishuService()).toBe(getFeishuService());
  });

  it('should build brief (or return error message)', async () => {
    const svc = getFeishuService();
    vi.spyOn(require('child_process'), 'execSync').mockReturnValue('test brief content' as any);
    const result = await svc.buildBrief();
    expect(typeof result).toBe('string');
  });

  it('should handle buildBrief failure', async () => {
    vi.spyOn(require('child_process'), 'execSync').mockImplementation(() => { throw new Error('python not found'); });
    const svc = getFeishuService();
    const result = await svc.buildBrief();
    expect(result).toContain('失败');
  });

  it('should send content to file and return sent status', async () => {
    const writeSpy = vi.spyOn(require('fs'), 'writeFileSync').mockImplementation(() => {});
    const result = await getFeishuService().send('test content');
    expect(result.status).toBe('sent');
    expect(result.channel).toBe('feishu');
    expect(writeSpy).toHaveBeenCalled();
  });

  it('should handle send failure', async () => {
    vi.spyOn(require('fs'), 'writeFileSync').mockImplementation(() => { throw new Error('disk full'); });
    const result = await getFeishuService().send('test');
    expect(result.status).toBe('failed');
  });

  it('should run daily workflow', async () => {
    vi.spyOn(require('child_process'), 'execSync').mockReturnValue('brief' as any);
    vi.spyOn(require('fs'), 'writeFileSync').mockImplementation(() => {});
    await getFeishuService().runDaily();
  });
});
