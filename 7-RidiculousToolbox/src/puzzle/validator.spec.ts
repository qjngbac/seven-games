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

  it('同一标签"既当工具又会被消耗" → 报错（防关键道具被意外用掉）', () => {
    const bad: Level = JSON.parse(JSON.stringify(L1));
    // cable 在 L1 中已被声明为不消耗的工具；这里再加一条会消耗 cable 的配方
    bad.recipes.push({
      recipeId: 'consume_cable_bad',
      kind: 'use',
      inputs: [{ tag: 'cable' }], // 未声明 consumed:false → 会消耗
      target: { id: 'outlet' },
      outputs: [{ setScene: { targetId: 'outlet', state: { powered: false } } }],
      feedback: '把线剪了',
      priority: 3,
      category: 'neutral',
    });
    const errors = validateLevel(bad).filter((i) => i.severity === 'error');
    expect(errors.some((e) => e.message.includes('工具消耗语义不一致'))).toBe(true);
  });

  it('全部关卡（含 20 关）工具消耗语义一致', () => {
    for (const lv of LEVELS) {
      const errors = validateLevel(lv).filter((i) => i.severity === 'error');
      expect(errors, `${lv.id}: ${errors.map((e) => e.message).join('；')}`).toHaveLength(0);
    }
  });
});
