import { describe, it, expect } from 'vitest';
import { initState, applyOperation } from '../logic/engine';
import { evaluateSolutions } from '../logic/solutions';
import { ITEM_DEFS } from '../data/items';
import { LEVELS } from '../data/levels';
import type { GameState } from '../logic/schema';

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
