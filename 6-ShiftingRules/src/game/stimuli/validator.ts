/**
 * 规则集校验器 (文档 §5.2 / §8.4)。
 * 对全刺激空间随机采样（默认 20000），验证：
 *  1. 每个刺激经规则引擎后「最终动作唯一」——不变量由确定性 fold 保证；
 *  2. 同优先级规则同时命中时，应用顺序不影响结果（否则记冲突）；
 *  3. 每条规则在样本中至少命中一次（可达性，防止死规则）。
 * 这是文档要求的「随机生成至少 10000 个刺激，验证最终动作唯一」的权威实现。
 */
import type { Action, Rule, Stimulus } from "../rules/schema";
import type { Rng } from "../rng";
import { matchPredicate, reduce } from "../rules/evaluator";
import { randomStimulus } from "./space";

export interface ValidationReport {
  sampleSize: number;
  /** 同优先级且同命中但顺序不同导致结果不同的冲突规则对 */
  conflicts: [string, string][];
  /** 样本中从未命中的规则 id（不可达） */
  unreachable: string[];
  /** 出现歧义的刺激数量 */
  ambiguousCount: number;
  /** 实际出现过的动作种类数（应为 1~3） */
  distinctActions: number;
}

function fold(hits: Rule[], invertTie: boolean): Action {
  const sorted = hits
    .slice()
    .sort((a, b) => a.priority - b.priority || (a.id < b.id ? (invertTie ? 1 : -1) : invertTie ? -1 : 1));
  let act: Action = "SKIP";
  for (const r of sorted) act = reduce(act, r.action);
  return act;
}

export function validateRuleSet(rules: Rule[], rng: Rng, sampleSize = 20000): ValidationReport {
  const matched = new Set<string>();
  const conflicts = new Map<string, [string, string]>();
  let ambiguousCount = 0;
  const actionSet = new Set<Action>();

  for (let i = 0; i < sampleSize; i++) {
    const s: Stimulus = randomStimulus(rng, 0.7);
    const hits = rules.filter((r) => matchPredicate(r.predicate, s));
    for (const h of hits) matched.add(h.id);

    // 按优先级分组，检查同优先级有多条命中且顺序敏感
    const byPri = new Map<number, Rule[]>();
    for (const h of hits) {
      const arr = byPri.get(h.priority) ?? [];
      arr.push(h);
      byPri.set(h.priority, arr);
    }
    let ambiguousThis = false;
    for (const [, arr] of byPri) {
      if (arr.length > 1) {
        const a = fold(hits, false);
        const b = fold(hits, true);
        if (a !== b) {
          ambiguousThis = true;
          const pair: [string, string] = [arr[0].id, arr[1].id].sort() as [string, string];
          conflicts.set(pair.join("|"), pair);
        }
      }
    }
    if (ambiguousThis) ambiguousCount++;
    actionSet.add(fold(hits, false));
  }

  const unreachable = rules.filter((r) => !matched.has(r.id)).map((r) => r.id);
  return {
    sampleSize,
    conflicts: [...conflicts.values()],
    unreachable,
    ambiguousCount,
    distinctActions: actionSet.size,
  };
}
