import type { ItemDefinition, ItemInstance, InputSpec, Tag } from './schema';

/** 物品类型注册表：defId -> 定义（全局共享、不可变） */
export type ItemRegistry = Record<string, ItemDefinition>;

/** 依据类型定义创建一个背包实例 */
export function createInstance(
  defs: ItemRegistry,
  defId: string,
  nextId: number,
  opts?: { state?: Record<string, unknown>; name?: string; quantity?: number }
): ItemInstance {
  const def = defs[defId];
  if (!def) throw new Error(`未知物品定义: ${defId}`);
  return {
    instanceId: `i${nextId}`,
    defId,
    state: opts?.state ? { ...opts.state } : {},
    quantity: opts?.quantity ?? 1,
    name: opts?.name,
  };
}

export function getInstanceDef(defs: ItemRegistry, inst: ItemInstance): ItemDefinition {
  const def = defs[inst.defId];
  if (!def) throw new Error(`实例引用了未知定义: ${inst.defId}`);
  return def;
}

export function instanceName(defs: ItemRegistry, inst: ItemInstance): string {
  if (inst.name) return inst.name;
  return getInstanceDef(defs, inst).name;
}

export function instanceTags(defs: ItemRegistry, inst: ItemInstance): Tag[] {
  return getInstanceDef(defs, inst).tags;
}

export function instanceIcon(defs: ItemRegistry, inst: ItemInstance): string {
  return getInstanceDef(defs, inst).icon;
}

export function hasTag(defs: ItemRegistry, inst: ItemInstance, tag: Tag): boolean {
  return instanceTags(defs, inst).includes(tag);
}

/** 实例是否满足输入规格（tag/item + 可选状态要求） */
export function matchInput(defs: ItemRegistry, inst: ItemInstance, spec: InputSpec): boolean {
  if (spec.item && inst.defId !== spec.item) return false;
  if (spec.tag && !hasTag(defs, inst, spec.tag)) return false;
  if (spec.requireState) {
    for (const [k, v] of Object.entries(spec.requireState)) {
      if (inst.state[k] !== v) return false;
    }
  }
  return true;
}
