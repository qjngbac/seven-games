import { describe, it, expect } from 'vitest';
import { levelsByChapter } from './repository';

describe('章节分组（第一章到第四章，每章 4 关）', () => {
  const groups = levelsByChapter();
  it('共 4 章', () => {
    expect(groups.length).toBe(4);
  });
  it('章号连续为 1-4', () => {
    expect(groups.map((g) => g.chapter)).toEqual([1, 2, 3, 4]);
  });
  it('每章标题为第N章且含 4 关', () => {
    for (const g of groups) {
      expect(g.title).toBe(`第${g.chapter}章`);
      expect(g.levels.length).toBe(4);
    }
  });
});
