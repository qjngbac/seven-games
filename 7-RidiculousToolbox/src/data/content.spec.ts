import { describe, it, expect } from 'vitest';
import { reportContent } from '../puzzle/repository';

describe('内容批量校验（20 关全部唯一匹配 + 至少一解可达）', () => {
  const report = reportContent();
  it('共 20 关', () => {
    expect(report.total).toBe(20);
  });
  it('无校验错误（引用完整性 / 优先级冲突）', () => {
    const errs = report.errors.filter((e) => e.severity === 'error');
    if (errs.length) {
      // eslint-disable-next-line no-console
      console.log('[CONTENT ERRORS]', JSON.stringify(errs, null, 2));
    }
    expect(errs.length).toBe(0);
  });
  it('每关至少一条解法可达', () => {
    if (report.unreachable.length) {
      // eslint-disable-next-line no-console
      console.log('[UNREACHABLE]', JSON.stringify(report.unreachable, null, 2));
    }
    expect(report.unreachable.length).toBe(0);
    for (const r of report.reachability) {
      expect(r.reachable).toBe(true);
      expect(r.path.length).toBeGreaterThan(0);
    }
  });
});
