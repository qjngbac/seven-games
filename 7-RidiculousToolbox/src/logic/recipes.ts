import type { GameState, InputSpec, ItemInstance, Recipe, RecipeCondition, SceneTargetDef, Verb } from './schema';
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
 * 输入规格的「具体度」，越大越具体。
 * 用于同优先级多条命中时的歧义消解：让"更具体的规则"赢，而不是靠数组声明顺序。
 *
 * 典型场景：橡胶块同时带 rubber 与 adhesive 标签，会同时命中
 * 「橡胶堵漏（专业）」与「胶带缠缝（离谱）」两条同优先级配方 —— 应由更专属的 rubber 规则胜出。
 */
function specSpecificity(defs: ItemRegistry, spec: InputSpec): number {
  let score = 0;
  // 精确物品 > 标签匹配
  if (spec.item) score += 1000;
  if (spec.tag) {
    const owners = Object.values(defs).filter((d) => d.tags.includes(spec.tag!)).length;
    // 拥有该标签的物品越少 → 该标签越专属 → 分越高（如 clean=1 条 > liquid=6 条）
    score += 100 - Math.min(99, owners);
  }
  if (spec.requireState) score += 10 * Object.keys(spec.requireState).length;
  if ((spec.count ?? 1) > 1) score += 5;
  return score;
}

function recipeSpecificity(defs: ItemRegistry, r: Recipe): number {
  return r.inputs.reduce((acc, s) => acc + specSpecificity(defs, s), 0);
}

/**
 * 配方匹配（文档 §6.4）：
 *   normalized -> candidates(匹配输入) -> filter(条件) -> uniqueHighestPriority
 * 返回唯一最高优先级配方；若无匹配返回 null。
 * 同优先级多条命中时按「具体度」消解（见 specSpecificity），仍并列才退回声明顺序并报错。
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
  if (top.length === 1) return top[0];

  // 同优先级并列：优先取更具体的配方
  const scored = top.map((r) => ({ r, s: recipeSpecificity(defs, r) }));
  const bestScore = Math.max(...scored.map((x) => x.s));
  const winners = scored.filter((x) => x.s === bestScore).map((x) => x.r);
  if (winners.length > 1) {
    // 具体度也完全并列 —— 内容配置问题（validateLevel 会拦截同签名的情况），
    // 这里保持确定性（取第一条）并显式报错，避免"静默选错配方"。
    // eslint-disable-next-line no-console
    console.error(
      `配方歧义无法消解：${winners.map((r) => r.recipeId).join(', ')} 输入与优先级完全相同，运行期只会命中第一条。请修正关卡数据。`,
    );
  }
  return winners[0];
}
