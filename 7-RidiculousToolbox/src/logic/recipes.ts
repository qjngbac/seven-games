import type { GameState, ItemInstance, Recipe, RecipeCondition, SceneTargetDef, Verb } from './schema';
import { hasTag, matchInput, type ItemRegistry } from './items';

/** 评估单条配方条件 */
export function evalCondition(
  defs: ItemRegistry,
  cond: RecipeCondition,
  state: GameState,
  inventory: ItemInstance[]
): boolean {
  if (cond.flag) return state.flags[cond.flag.key] === cond.flag.equals;
  if (cond.targetState) {
    const s = state.scene[cond.targetState.targetId] ?? {};
    return Object.entries(cond.targetState.state).every(([k, v]) => s[k] === v);
  }
  if (cond.hasItem) {
    return inventory.some((inst) =>
      cond.hasItem!.defId ? inst.defId === cond.hasItem!.defId : hasTag(defs, inst, cond.hasItem!.tag!)
    );
  }
  return true;
}

function combineMatches(defs: ItemRegistry, recipe: Recipe, instances: ItemInstance[]): boolean {
  if (recipe.kind !== 'combine') return false;
  const reqs = recipe.inputs.map((s) => ({ spec: s, need: s.count ?? 1 }));
  const totalNeed = reqs.reduce((a, b) => a + b.need, 0);
  if (totalNeed !== instances.length) return false;
  const used = new Array(instances.length).fill(false);
  for (const r of reqs) {
    let got = 0;
    for (let i = 0; i < instances.length && got < r.need; i++) {
      if (!used[i] && matchInput(defs, instances[i], r.spec)) {
        used[i] = true;
        got++;
      }
    }
    if (got < r.need) return false;
  }
  return used.every(Boolean);
}

function useMatches(
  defs: ItemRegistry,
  recipe: Recipe,
  item: ItemInstance,
  targetDef: SceneTargetDef,
  verb?: Verb
): boolean {
  if (recipe.kind !== 'use') return false;
  if (recipe.inputs.length < 1) return false;
  if (!matchInput(defs, item, recipe.inputs[0])) return false;
  if (recipe.target) {
    if (recipe.target.id && recipe.target.id !== targetDef.id) return false;
    if (recipe.target.tag && !targetDef.tags.includes(recipe.target.tag)) return false;
  }
  if (recipe.verb && verb && recipe.verb !== verb) return false;
  return true;
}

/**
 * 配方匹配（文档 §6.4）：
 *   normalized -> candidates(匹配输入) -> filter(条件) -> uniqueHighestPriority
 * 返回唯一最高优先级配方；若无匹配返回 null。
 */
export function findRecipe(
  defs: ItemRegistry,
  recipes: Recipe[],
  op: { kind: 'combine'; instances: ItemInstance[] } | { kind: 'use'; item: ItemInstance; targetDef: SceneTargetDef; verb?: Verb },
  state: GameState
): Recipe | null {
  let candidates: Recipe[];
  if (op.kind === 'combine') {
    candidates = recipes.filter((r) => combineMatches(defs, r, op.instances));
  } else {
    candidates = recipes.filter((r) => useMatches(defs, r, op.item, op.targetDef, op.verb));
  }
  candidates = candidates.filter((r) => (r.conditions ?? []).every((c) => evalCondition(defs, c, state, op.kind === 'combine' ? op.instances : [op.item])));
  if (candidates.length === 0) return null;
  const maxPriority = Math.max(...candidates.map((c) => c.priority ?? 0));
  const top = candidates.filter((c) => (c.priority ?? 0) === maxPriority);
  if (top.length > 1) {
    // 加载期校验应已拦截同优先级冲突；运行期取第一个保持确定性
    return top[0];
  }
  return top[0];
}
