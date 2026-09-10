import type {
  GameState,
  ItemInstance,
  Level,
  Operation,
  OperationResult,
  Recipe,
  SceneTargetDef,
  SolutionTier,
} from './schema';
import { cloneState } from './command';
import { instanceName, matchInput, type ItemRegistry } from './items';
import { findRecipe } from './recipes';
import { TIER_RANK } from './solutions';
import { genericCombineFeedback, genericUseFeedback } from './feedback';

/** 由关卡定义初始化运行期状态（重新分配实例 id，保证唯一） */
export function initState(level: Level, startId = 1): GameState {
  let n = startId;
  const inventory: ItemInstance[] = level.items.map((it) => ({
    instanceId: `i${n++}`,
    defId: it.defId,
    state: { ...it.state },
    quantity: it.quantity ?? 1,
    name: it.name,
  }));
  const scene: Record<string, Record<string, unknown>> = {};
  for (const t of level.targets) scene[t.id] = { ...t.initial };
  const flags: Record<string, unknown> = { ...level.initialFlags };
  return { levelId: level.id, inventory, scene, flags, nextInstanceId: n };
}

function resolveTarget(level: Level, targetId: string): SceneTargetDef | null {
  return level.targets.find((t) => t.id === targetId) ?? null;
}

function consumedIdsFor(
  defs: ItemRegistry,
  recipe: Recipe,
  selected: ItemInstance[]
): Set<string> {
  const consumed = new Set<string>();
  for (const spec of recipe.inputs) {
    if (spec.consumed === false) continue;
    let need = spec.count ?? 1;
    for (const inst of selected) {
      if (need <= 0) break;
      if (!consumed.has(inst.instanceId) && matchInput(defs, inst, spec)) {
        consumed.add(inst.instanceId);
        need--;
      }
    }
  }
  return consumed;
}

/**
 * 执行一次操作，返回结果与新状态（不可变：返回克隆后的新状态）。
 * 文档 §3：系统根据配方/标签/场景条件产生结果；无配方走通用失败反馈。
 */
export function applyOperation(
  defs: ItemRegistry,
  level: Level,
  state: GameState,
  op: Operation
): { result: OperationResult; next: GameState } {
  const next = cloneState(state);

  if (op.kind === 'combine') {
    const selected = op.instanceIds
      .map((id) => state.inventory.find((i) => i.instanceId === id))
      .filter((x): x is ItemInstance => !!x);
    if (selected.length !== op.instanceIds.length) {
      return noRecipe('你手里没有这些道具。', next);
    }
    const recipe = findRecipe(defs, level.recipes, { kind: 'combine', instances: selected }, state);
    if (!recipe) {
      const msg = genericCombineFeedback(defs, selected);
      return { result: { ok: false, kind: 'no-recipe', feedback: msg, produced: [], consumed: [], sceneChanges: [], flagChanges: [] }, next };
    }
    const consumed = consumedIdsFor(defs, recipe, selected);
    return commit(defs, level, next, recipe, selected, consumed);
  }

  // use
  const item = state.inventory.find((i) => i.instanceId === op.instanceId);
  const targetDef = resolveTarget(level, op.targetId);
  if (!item || !targetDef) return noRecipe('目标或道具不存在。', next);
  const recipe = findRecipe(defs, level.recipes, { kind: 'use', item, targetDef, verb: op.verb }, state);
  if (!recipe) {
    const msg = genericUseFeedback(defs, item, targetDef);
    return { result: { ok: false, kind: 'no-recipe', feedback: msg, produced: [], consumed: [], sceneChanges: [], flagChanges: [] }, next };
  }
  const consumed = consumedIdsFor(defs, recipe, [item]);
  return commit(defs, level, next, recipe, [item], consumed);
}

function noRecipe(feedback: string, current: GameState): { result: OperationResult; next: GameState } {
  return {
    result: { ok: false, kind: 'no-recipe', feedback, produced: [], consumed: [], sceneChanges: [], flagChanges: [] },
    next: current,
  };
}

function commit(
  defs: ItemRegistry,
  level: Level,
  next: GameState,
  recipe: Recipe,
  selected: ItemInstance[],
  consumed: Set<string>
): { result: OperationResult; next: GameState } {
  const produced: ItemInstance[] = [];
  const consumedList: string[] = [];
  const sceneChanges: { targetId: string; state: Record<string, unknown> }[] = [];
  const flagChanges: { key: string; value: unknown }[] = [];

  // 移除被消耗输入
  const shouldConsume = (recipe.outputs ?? []).some((o) => o.consumeInputs !== false);
  if (shouldConsume) {
    for (const inst of selected) {
      if (consumed.has(inst.instanceId)) {
        consumedList.push(inst.instanceId);
      }
    }
    next.inventory = next.inventory.filter((i) => !consumedList.includes(i.instanceId));
  }

  for (const out of recipe.outputs ?? []) {
    if (out.addItem) {
      const inst: ItemInstance = {
        instanceId: `i${next.nextInstanceId++}`,
        defId: out.addItem.defId,
        state: out.addItem.state ? { ...out.addItem.state } : {},
        quantity: out.addItem.count ?? 1,
        name: out.addItem.name,
      };
      next.inventory.push(inst);
      produced.push(inst);
    }
    if (out.setScene) {
      const cur = next.scene[out.setScene.targetId] ?? {};
      next.scene[out.setScene.targetId] = { ...cur, ...out.setScene.state };
      sceneChanges.push({ targetId: out.setScene.targetId, state: out.setScene.state });
    }
    if (out.setFlag) {
      let value = out.setFlag.value;
      // solvedTier 只升不降：先做出专业解、之后再随手做一次离谱操作，不应把评价反降为"离谱"。
      if (out.setFlag.key === 'solvedTier') {
        const cur = next.flags['solvedTier'];
        if (
          typeof cur === 'string' &&
          cur in TIER_RANK &&
          typeof value === 'string' &&
          value in TIER_RANK &&
          TIER_RANK[value as SolutionTier] < TIER_RANK[cur as SolutionTier]
        ) {
          value = cur;
        }
      }
      next.flags[out.setFlag.key] = value;
      flagChanges.push({ key: out.setFlag.key, value });
    }
  }

  const feedback = (recipe.outputs ?? []).map((o) => o.feedback).find(Boolean) ?? recipe.feedback;
  const kind: OperationResult['kind'] =
    recipe.category === 'failure' ? 'failure' : recipe.category === 'neutral' ? 'neutral' : 'success';

  const result: OperationResult = {
    ok: kind !== 'failure',
    kind,
    recipe,
    feedback,
    produced,
    consumed: consumedList,
    sceneChanges,
    flagChanges,
    galleryNote: recipe.galleryNote,
    matchedBy: 'recipe',
  };
  void defs;
  void level;
  void instanceName;
  return { result, next };
}
