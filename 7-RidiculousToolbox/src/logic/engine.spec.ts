import { describe, it, expect } from 'vitest';
import { initState, applyOperation } from '../logic/engine';
import { evaluateSolutions } from '../logic/solutions';
import { ITEM_DEFS } from '../data/items';
import { LEVELS } from '../data/levels';
import type { GameState, Level } from '../logic/schema';

const L1 = LEVELS.find((l) => l.id === 'l1')!;

function instByDef(state: GameState, defId: string): string {
  const inst = state.inventory.find((i) => i.defId === defId);
  if (!inst) throw new Error(`背包中没有 ${defId}`);
  return inst.instanceId;
}

describe('engine：组合与使用', () => {
  it('风扇+网线（有电）→ 接好线的风扇', () => {
    const s = initState(L1);
    const { result, next } = applyOperation(ITEM_DEFS, L1, s, {
      kind: 'combine',
      instanceIds: [instByDef(s, 'fan'), instByDef(s, 'cable')],
    });
    expect(result.ok).toBe(true);
    expect(next.inventory.some((i) => i.defId === 'fan' && i.state.wired === true)).toBe(true);
    // 网线作为工具不消耗
    expect(next.inventory.some((i) => i.defId === 'cable')).toBe(true);
    expect(result.kind).toBe('neutral');
  });

  it('接好线的风扇用于服务器 → 专业解法（temp=low, cooling）', () => {
    const s = initState(L1);
    const w = applyOperation(ITEM_DEFS, L1, s, {
      kind: 'combine',
      instanceIds: [instByDef(s, 'fan'), instByDef(s, 'cable')],
    });
    const r = applyOperation(ITEM_DEFS, L1, w.next, {
      kind: 'use',
      instanceId: w.next.inventory.find((i) => i.state.wired === true)!.instanceId,
      targetId: 'server',
    });
    expect(r.next.scene.server.temp).toBe('low');
    expect(r.next.scene.server.coolingActive).toBe(true);
    expect(r.next.flags.solvedTier).toBe('professional');
    expect(evaluateSolutions(L1.solutions, r.next)?.tier).toBe('professional');
  });

  it('冰淇淋用于服务器 → 触发液体损坏（失败，可撤销）', () => {
    const s = initState(L1);
    const r = applyOperation(ITEM_DEFS, L1, s, {
      kind: 'use',
      instanceId: instByDef(s, 'icecream'),
      targetId: 'server',
    });
    expect(r.result.kind).toBe('failure');
    expect(r.next.scene.server.damaged).toBe(true);
    expect(r.result.galleryNote).toBeTruthy();
  });

  it('无精确配方 → 通用失败反馈，不改状态', () => {
    const s = initState(L1);
    const before = JSON.stringify(s.scene);
    const r = applyOperation(ITEM_DEFS, L1, s, {
      kind: 'combine',
      instanceIds: [instByDef(s, 'tape'), instByDef(s, 'box')],
    });
    expect(r.result.kind).toBe('no-recipe');
    expect(JSON.stringify(r.next.scene)).toBe(before);
  });

  it('临时解法：胶带风扇用于服务器 → temp=medium', () => {
    const s = initState(L1);
    const t = applyOperation(ITEM_DEFS, L1, s, {
      kind: 'combine',
      instanceIds: [instByDef(s, 'fan'), instByDef(s, 'tape')],
    });
    const r = applyOperation(ITEM_DEFS, L1, t.next, {
      kind: 'use',
      instanceId: t.next.inventory.find((i) => i.state.taped === true)!.instanceId,
      targetId: 'server',
    });
    expect(r.next.scene.server.temp).toBe('medium');
    expect(r.next.flags.solvedTier).toBe('temporary');
  });
});

describe('engine：工具不消耗必须全关一致（防软锁）', () => {
  it('先用网线捅进风口，网线仍在背包里，专业解依旧可做', () => {
    const s = initState(L1);
    const cableId = instByDef(s, 'cable');
    // 1) 用网线捅进风口（中性操作）
    const poke = applyOperation(ITEM_DEFS, L1, s, {
      kind: 'use',
      instanceId: cableId,
      targetId: 'server',
    });
    expect(poke.result.ok).toBe(true);
    expect(poke.next.scene.server.intakeBlocked).toBe(false);
    // 2) 网线必须还在（它是本关的"工具"，不该被消耗）
    expect(
      poke.next.inventory.some((i) => i.defId === 'cable'),
      '网线被意外消耗了：同一关内工具的消耗语义必须一致',
    ).toBe(true);
    // 3) 因此专业解仍可达成
    const w = applyOperation(ITEM_DEFS, L1, poke.next, {
      kind: 'combine',
      instanceIds: [instByDef(poke.next, 'fan'), instByDef(poke.next, 'cable')],
    });
    expect(w.result.ok).toBe(true);
  });

  it('失败配方也不应吞掉工具（网线 + 胶带）', () => {
    const s = initState(L1);
    const r = applyOperation(ITEM_DEFS, L1, s, {
      kind: 'combine',
      instanceIds: [instByDef(s, 'cable'), instByDef(s, 'tape')],
    });
    expect(r.result.kind).toBe('failure');
    expect(r.next.inventory.some((i) => i.defId === 'cable')).toBe(true);
  });
});

describe('engine：同优先级歧义应由"更具体的规则"胜出', () => {
  const L15 = LEVELS.find((l) => l.id === 'l15')!;

  it('橡胶块同时带 rubber/adhesive 标签 → 命中专业止漏，而不是胶带缠缝（离谱）', () => {
    const s = initState(L15);
    const r = applyOperation(ITEM_DEFS, L15, s, {
      kind: 'use',
      instanceId: instByDef(s, 'rubber'),
      targetId: 'fishtank',
    });
    expect(r.result.recipe?.recipeId, '更专属的 rubber 规则应当胜出').toBe('l15_pro');
    expect(r.next.flags.solvedTier).toBe('professional');
  });

  it('胶带 → 仍命中离谱解法（其 bespoke 输入不受影响）', () => {
    const s = initState(L15);
    const r = applyOperation(ITEM_DEFS, L15, s, {
      kind: 'use',
      instanceId: instByDef(s, 'tape'),
      targetId: 'fishtank',
    });
    expect(r.result.recipe?.recipeId).toBe('l15_absurd');
  });
});

describe('engine：solvedTier 只升不降', () => {
  const TINY: Level = {
    id: 'tiny',
    chapter: 1,
    title: 'tiny',
    brief: '',
    goalText: '',
    items: [
      { instanceId: '', defId: 'rubber', state: {}, quantity: 1 },
      { instanceId: '', defId: 'tape', state: {}, quantity: 1 },
    ],
    targets: [
      { id: 'a', name: 'A', icon: '', tags: [], description: '', initial: {} },
      { id: 'b', name: 'B', icon: '', tags: [], description: '', initial: {} },
    ],
    initialFlags: {},
    recipes: [
      { recipeId: 'set_pro', kind: 'use', inputs: [{ item: 'rubber' }], target: { id: 'a' }, outputs: [{ setFlag: { key: 'solvedTier', value: 'professional' } }], feedback: 'pro', priority: 10, category: 'neutral' },
      { recipeId: 'set_abs', kind: 'use', inputs: [{ item: 'tape' }], target: { id: 'b' }, outputs: [{ setFlag: { key: 'solvedTier', value: 'absurd' } }], feedback: 'abs', priority: 10, category: 'neutral' },
    ],
    solutions: [],
  };

  it('先专业解、再做一次离谱操作，等级不会被反降', () => {
    const s = initState(TINY);
    const pro = applyOperation(ITEM_DEFS, TINY, s, {
      kind: 'use',
      instanceId: instByDef(s, 'rubber'),
      targetId: 'a',
    });
    expect(pro.next.flags.solvedTier).toBe('professional');
    const abs = applyOperation(ITEM_DEFS, TINY, pro.next, {
      kind: 'use',
      instanceId: instByDef(pro.next, 'tape'),
      targetId: 'b',
    });
    expect(abs.next.flags.solvedTier, '更低的解法等级不应覆盖已取得的成绩').toBe('professional');
  });
});
