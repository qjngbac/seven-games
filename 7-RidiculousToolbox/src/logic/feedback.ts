import type { ItemInstance, SceneTargetDef } from './schema';
import { hasTag, instanceName, instanceTags, type ItemRegistry } from './items';
import { GENERIC_FAILURE_RULES } from '../data/feedback';

export interface GenericFailureRule {
  tags: string[];
  msg: string;
}

/** 通用失败反馈：无精确配方时，按物品/目标标签组合给出有意义反馈（文档 §3.2 / §6.4）。 */
export function genericCombineFeedback(defs: ItemRegistry, instances: ItemInstance[]): string {
  const allTags = instances.flatMap((i) => instanceTags(defs, i));
  let best: { rule: GenericFailureRule; n: number } | null = null;
  for (const rule of GENERIC_FAILURE_RULES) {
    if (rule.tags.every((t) => allTags.includes(t))) {
      if (!best || rule.tags.length > best.n) best = { rule, n: rule.tags.length };
    }
  }
  return best ? best.rule.msg : '这几样东西摆在一起，毫无化学反应，场面一度十分尴尬。';
}

export function genericUseFeedback(
  defs: ItemRegistry,
  item: ItemInstance,
  targetDef: SceneTargetDef
): string {
  const itags = instanceTags(defs, item);
  const ttags = targetDef.tags;
  let best: { rule: GenericFailureRule; n: number } | null = null;
  for (const rule of GENERIC_FAILURE_RULES) {
    const req = rule.tags;
    const covered = req.every((t) => itags.includes(t) || ttags.includes(t));
    if (covered) {
      const overlap = req.filter((t) => itags.includes(t) || ttags.includes(t)).length;
      if (!best || overlap > best.n) best = { rule, n: overlap };
    }
  }
  if (best) return best.rule.msg;
  const covers = (t: string) => itags.includes(t) || ttags.includes(t);
  void hasTag;
  return `你把「${instanceName(defs, item)}」往「${targetDef.name}」上凑了凑，但它不为所动。`;
}
