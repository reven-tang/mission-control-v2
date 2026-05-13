import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFeishuService } from '../../src/lib/services/feishu';
import * as cp from 'child_process';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('FeishuService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should return singleton', () => {
    expect(getFeishuService()).toBe(getFeishuService());
  });

  it('should build brief (or return error message)', async () => {
    (cp.execSync as any).mockReturnValue('test brief content');
    const result = await getFeishuService().buildBrief();
    expect(typeof result).toBe('string');
  });

  it('should handle buildBrief failure', async () => {
    (cp.execSync as any).mockImplementation(() => { throw new Error('python not found'); });
    const result = await getFeishuService().buildBrief();
    expect(result).toContain('失败');
  });

  it('should send content to file and return sent status', async () => {
    const writeSpy = vi.spyOn(require('fs'), 'writeFileSync').mockImplementation(() => {});
    const result = await getFeishuService().send('test content');
    expect(result.status).toBe('sent');
    expect(result.channel).toBe('feishu');
    writeSpy.mockRestore();
  });

  it('should handle send failure', async () => {
    vi.spyOn(require('fs'), 'writeFileSync').mockImplementation(() => { throw new Error('disk full'); });
    const result = await getFeishuService().send('test content');
    expect(result.status).toBe('failed');
  });

  it('should run daily workflow', async () => {
    (cp.execSync as any).mockReturnValue('brief');
    const writeSpy = vi.spyOn(require('fs'), 'writeFileSync').mockImplementation(() => {});
    await getFeishuService().runDaily();
    writeSpy.mockRestore();
  });
});
