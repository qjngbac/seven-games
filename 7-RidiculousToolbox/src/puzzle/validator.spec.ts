import { describe, it, expect } from 'vitest';
import { validateLevel } from '../puzzle/validator';
import { LEVELS } from '../data/levels';
import type { Level } from '../logic/schema';

const L1 = LEVELS.find((l) => l.id === 'l1')!;

describe('validator：校验规则', () => {
  it('真实关卡无错误', () => {
    const issues = validateLevel(L1).filter((i) => i.severity === 'error');
    expect(issues.length).toBe(0);
  });

  it('同签名同优先级多条 → 报错（加载期冲突）', () => {
    const bad: Level = JSON.parse(JSON.stringify(L1));
    bad.recipes.push({
      recipeId: 'dup_conflict',
      kind: 'combine',
      inputs: [{ tag: 'fan' }, { tag: 'cable', consumed: false }],
      conditions: [{ flag: { key: 'power_available', equals: true } }],
      outputs: [{ addItem: { defId: 'fan', state: { wired: true }, name: '重复' } }],
      feedback: '重复',
      priority: 8,
      category: 'neutral',
    });
    const errors = validateLevel(bad).filter((i) => i.severity === 'error');
    expect(errors.some((e) => e.message.includes('优先级冲突'))).toBe(true);
  });

  it('引用未知物品 → 报错', () => {
    const bad: Level = JSON.parse(JSON.stringify(L1));
    bad.recipes.push({
      recipeId: 'unknown_item',
      kind: 'combine',
      inputs: [{ item: 'does_not_exist' }],
      outputs: [],
      feedback: 'x',
      priority: 5,
      category: 'failure',
    });
    const errors = validateLevel(bad).filter((i) => i.severity === 'error');
    expect(errors.some((e) => e.message.includes('未知物品'))).toBe(true);
  });
});
