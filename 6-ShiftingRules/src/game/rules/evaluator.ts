/**
 * 规则求值器 (RuleEvaluator，文档 §6.3)。
 * 职责：给定刺激与规则集，返回「唯一动作」+「命中轨迹」。
 * 不处理分数、不碰 UI、不解析规则展示文本。
 *
 * 求值算法 (文档 §6.4)：
 *   matches = rules.filter(predicate(stimulus))
 *   sort matches by priority asc   (高优先级后应用 = 覆盖/修饰权重更高)
 *   action = DEFAULT(SKIP)
 *   for rule in matches: action = reduce(action, rule.action)
 *   assert action is unique
 * 因为 reduce 是确定性 fold，动作天然唯一；冲突检测见 compiler/validator。
 */
import type { Action, EvalResult, HitTrace, Predicate, Rule, Stimulus, StimField } from "./schema";

export const DEFAULT_ACTION: Action = "SKIP";

/** 组合归约：把当前动作与新规则动作合并 */
export function reduce(current: Action, next: Action): Action {
  if (next === "INVERT_BASE") {
    // 修饰型：LEFT<->RIGHT 互换，SKIP 不受影响
    if (current === "LEFT") return "RIGHT";
    if (current === "RIGHT") return "LEFT";
    return "SKIP";
  }
  // LEFT / RIGHT / SKIP 都是「设定型」，直接覆盖当前动作
  return next;
}

/** 判断单个规范化谓词是否命中刺激 */
export function matchPredicate(p: Predicate, s: Stimulus): boolean {
  switch (p.kind) {
    case "always":
      return true;
    case "match":
      return matchField(p.field, p.op, p.value, s);
    case "and":
      return p.items.every((it) => matchPredicate(it, s));
    case "or":
      return p.items.some((it) => matchPredicate(it, s));
    case "not":
      return !matchPredicate(p.item, s);
  }
}

function matchField(field: StimField, op: string, value: string | number | undefined, s: Stimulus): boolean {
  switch (field) {
    case "color": {
      const v = s.color;
      if (v === undefined) return false;
      if (op === "eq") return v === value;
      if (op === "neq") return v !== value;
      return false;
    }
    case "word": {
      const v = s.word;
      if (v === undefined) return false;
      if (op === "eq") return v === value;
      if (op === "neq") return v !== value;
      return false;
    }
    case "number": {
      const v = s.number;
      if (v === undefined) return false;
      if (op === "even") return v % 2 === 0;
      if (op === "odd") return v % 2 === 1;
      if (op === "eq") return v === value;
      if (op === "gt") return typeof value === "number" && v > value;
      if (op === "lt") return typeof value === "number" && v < value;
      return false;
    }
    case "shape": {
      const v = s.shape;
      if (v === undefined) return false;
      if (op === "eq") return v === value;
      if (op === "neq") return v !== value;
      return false;
    }
    case "character": {
      const v = s.character;
      if (v === undefined) return false;
      if (op === "eq") return v === value;
      if (op === "neq") return v !== value;
      return false;
    }
    case "flags": {
      const arr = s.flags ?? [];
      if (op === "includes") return typeof value === "string" && arr.includes(value);
      if (op === "eq") return arr.length === 1 && arr[0] === value;
      return false;
    }
  }
}

/** 主求值：返回唯一动作 + 命中轨迹 (按优先级升序) */
export function evaluate(stimulus: Stimulus, rules: Rule[]): EvalResult {
  const matches = rules
    .filter((r) => matchPredicate(r.predicate, stimulus))
    .sort((a, b) => a.priority - b.priority);

  let action: Action = DEFAULT_ACTION;
  const trace: HitTrace[] = [];
  for (const r of matches) {
    action = reduce(action, r.action);
    trace.push({ ruleId: r.id, priority: r.priority, action: r.action, text: r.text });
  }
  return { action, trace, rawMatches: matches };
}

/** 仅取最终动作 (热路径用) */
export function resolveAction(stimulus: Stimulus, rules: Rule[]): Action {
  return evaluate(stimulus, rules).action;
}
