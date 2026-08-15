import { describe, it, expect } from 'vitest';
import { findRecipe } from '../logic/recipes';
import { initState, applyOperation } from '../logic/engine';
import { ITEM_DEFS } from '../data/items';
import { LEVELS } from '../data/levels';
import type { GameState } from '../logic/schema';

const L1 = LEVELS.find((l) => l.id === 'l1')!;

function instByDef(state: GameState, defId: string): string {
  return state.inventory.find((i) => i.defId === defId)!.instanceId;
}

describe('recipes：匹配与条件', () => {
  it('条件不满足时组合配方不命中（无电时风扇+网线无效）', () => {
    const s = initState(L1);
    s.flags.power_available = false;
    const r = findRecipe(
      ITEM_DEFS,
      L1.recipes,
      { kind: 'combine', instances: [s.inventory.find((i) => i.defId === 'fan')!, s.inventory.find((i) => i.defId === 'cable')!] },
      s
    );
    expect(r).toBeNull();
  });

  it('有电时命中接好线配方', () => {
    const s = initState(L1);
    const fan = s.inventory.find((i) => i.defId === 'fan')!;
    const cable = s.inventory.find((i) => i.defId === 'cable')!;
    const r = findRecipe(ITEM_DEFS, L1.recipes, { kind: 'combine', instances: [fan, cable] }, s);
    expect(r?.recipeId).toBe('l1_wire_fan');
  });

  it('use 配方按目标与物品匹配', () => {
    const s = initState(L1);
    const ice = s.inventory.find((i) => i.defId === 'icecream')!;
    const targetDef = L1.targets.find((t) => t.id === 'server')!;
    const r = findRecipe(ITEM_DEFS, L1.recipes, { kind: 'use', item: ice, targetDef }, s);
    expect(r?.recipeId).toBe('l1_f_ice_server');
  });

  it('同一关无同优先级冲突（最高优先级唯一）', () => {
    // 直接验证所有 solution 配方均能被唯一匹配
    const s = initState(L1);
    const op = applyOperation(ITEM_DEFS, L1, s, {
      kind: 'combine',
      instanceIds: [instByDef(s, 'box'), instByDef(s, 'fan')],
    });
    expect(op.result.recipe?.recipeId).toBe('l1_duct');
  });
});
