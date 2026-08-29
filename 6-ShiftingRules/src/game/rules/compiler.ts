/**
 * 规则编译器 (compiler.ts，文档 §6.2)。
 * 职责：
 *  1. 把 JSON 里的「简写谓词」规范化为内部 Predicate；
 *  2. 校验规则包 (id 唯一、动作合法、文本存在、谓词可编译)；
 *  3. 加载期冲突检测：同优先级且会同时命中的规则 → 阻止进入游戏 (文档 §5.2)。
 * 不实现判断逻辑本身（那在 evaluator）。
 */
import type { Action, Predicate, Rule, RuleSet, ShorthandPredicate, StimField, MatchOp } from "./schema";

const ACTIONS: Action[] = ["LEFT", "RIGHT", "SKIP", "INVERT_BASE"];

export interface RawRule {
  id: string;
  predicate: ShorthandPredicate;
  action: string;
  priority: number;
  text: string;
  example?: string;
}

export interface RawRuleSet {
  id: string;
  name: string;
  rules: RawRule[];
  conflictPolicy?: "block" | "warn";
  difficulty?: number;
  initialActive?: number;
  revealEvery?: number;
}

export interface CompileResult {
  ruleset: RuleSet | null;
  errors: string[];
  /** 同优先级冲突对 (ruleId, ruleId) */
  conflicts: [string, string][];
}

// ---------- 1. 简写谓词 → 规范化 ----------
export function compilePredicate(sh: ShorthandPredicate): Predicate {
  const o = sh as any;
  if (o && typeof o === "object" && "kind" in o) {
    // 已经是比较规范的写法，按 kind 递归编译子项
    if (o.kind === "and") return { kind: "and", items: (o.items as ShorthandPredicate[]).map(compilePredicate) };
    if (o.kind === "or") return { kind: "or", items: (o.items as ShorthandPredicate[]).map(compilePredicate) };
    if (o.kind === "not") return { kind: "not", item: compilePredicate(o.item) };
    if (o.kind === "always") return { kind: "always" };
    // match 规范化
    return { kind: "match", field: o.field as StimField, op: o.op as MatchOp, value: o.value };
  }
  if (o?.all) return { kind: "and", items: o.all.map(compilePredicate) };
  if (o?.any) return { kind: "or", items: o.any.map(compilePredicate) };
  if (o?.not) return { kind: "not", item: compilePredicate(o.not) };
  if (o?.color) return { kind: "match", field: "color", op: "eq", value: o.color };
  if (o?.word !== undefined) return { kind: "match", field: "word", op: "eq", value: o.word };
  if (o?.numberIsEven) return { kind: "match", field: "number", op: "even" };
  if (o?.numberIsOdd) return { kind: "match", field: "number", op: "odd" };
  if (o?.shape) return { kind: "match", field: "shape", op: "eq", value: o.shape };
  if (o?.character) return { kind: "match", field: "character", op: "eq", value: o.character };
  if (o?.flagsInclude) return { kind: "match", field: "flags", op: "includes", value: o.flagsInclude };
  // 未知简写（字段名拼错等）直接报错，而不是静默降级为「永远命中」的规则
  throw new Error(`无法识别的谓词简写：${JSON.stringify(sh)}`);
}

function compileRule(raw: RawRule, errors: string[]): Rule | null {
  if (typeof raw.id !== "string" || raw.id.length === 0) {
    errors.push(`规则缺少有效 id：${JSON.stringify(raw)}`);
    return null;
  }
  if (!ACTIONS.includes(raw.action as Action)) {
    errors.push(`规则 ${raw.id} 的动作非法：${raw.action}`);
    return null;
  }
  if (typeof raw.priority !== "number" || !Number.isFinite(raw.priority)) {
    errors.push(`规则 ${raw.id} 的优先级不是数字`);
    return null;
  }
  if (typeof raw.text !== "string" || raw.text.length === 0) {
    errors.push(`规则 ${raw.id} 缺少展示文本 (text)`);
    return null;
  }
  let predicate: Predicate;
  try {
    predicate = compilePredicate(raw.predicate);
  } catch (e) {
    errors.push(`规则 ${raw.id} 的谓词无法编译：${(e as Error).message}`);
    return null;
  }
  return {
    id: raw.id,
    predicate,
    action: raw.action as Action,
    priority: raw.priority,
    text: raw.text,
    example: raw.example,
  };
}

// ---------- 3. 同优先级冲突检测 ----------
interface Leaf {
  field: StimField;
  op: MatchOp;
  value?: string | number;
}

function asLeaf(p: Predicate): Leaf | null {
  return p.kind === "match" ? { field: p.field, op: p.op, value: p.value } : null;
}

function predEq(a: Predicate, b: Predicate): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** 保守判断：两谓词是否「可被证明」永远不能同时命中。返回 true = 互斥。 */
function mutuallyExclusive(a: Predicate, b: Predicate): boolean {
  const la = asLeaf(a);
  const lb = asLeaf(b);
  if (la && lb) {
    if (la.field === lb.field) {
      if (la.op === "eq" && lb.op === "eq") return la.value !== lb.value;
      if (la.op === "eq" && lb.op === "neq") return la.value === lb.value;
      if (la.op === "neq" && lb.op === "eq") return la.value === lb.value;
      if (la.op === "neq" && lb.op === "neq") return false; // 可同时成立
      if (la.field === "number" && la.op === "even" && lb.op === "odd") return true;
      if (la.field === "number" && la.op === "odd" && lb.op === "even") return true;
    }
    return false; // 不同字段，无法证明互斥
  }
  // 复合谓词：保守推理
  if (a.kind === "not" && predEq(a.item, b)) return true;
  if (b.kind === "not" && predEq(b.item, a)) return true;
  if (a.kind === "and") return a.items.some((x) => mutuallyExclusive(x, b));
  if (b.kind === "and") return b.items.some((x) => mutuallyExclusive(a, x));
  if (a.kind === "or") return a.items.every((x) => mutuallyExclusive(x, b));
  if (b.kind === "or") return b.items.every((x) => mutuallyExclusive(a, x));
  return false;
}

function overlap(a: Predicate, b: Predicate): boolean {
  return !mutuallyExclusive(a, b);
}

/** 一对规则是否构成冲突（加载期可阻止） */
export function isConflictPair(r1: Rule, r2: Rule): boolean {
  if (r1.priority !== r2.priority) return false;
  if (!overlap(r1.predicate, r2.predicate)) return false;
  // 会同时命中：若两者都是「相同设定动作」则无歧义；否则冲突
  if (r1.action === r2.action && r1.action !== "INVERT_BASE") return false;
  return true;
}

// ---------- 2 + 3. 编译整个规则包 ----------
export function compileRuleSet(raw: RawRuleSet): CompileResult {
  const errors: string[] = [];
  const conflicts: [string, string][] = [];

  if (typeof raw.id !== "string" || !raw.id) errors.push("规则包缺少 id");
  if (!Array.isArray(raw.rules) || raw.rules.length === 0) errors.push("规则包没有 rules");

  const ids = new Set<string>();
  const rules: Rule[] = [];
  for (const rr of raw.rules ?? []) {
    if (typeof rr.id === "string" && ids.has(rr.id)) errors.push(`规则 id 重复：${rr.id}`);
    if (typeof rr.id === "string") ids.add(rr.id);
    const compiled = compileRule(rr, errors);
    if (compiled) rules.push(compiled);
  }

  // 同优先级冲突两两检查
  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      if (isConflictPair(rules[i], rules[j])) conflicts.push([rules[i].id, rules[j].id]);
    }
  }

  const ruleSet: RuleSet | null = errors.length === 0
    ? {
        id: raw.id,
        name: raw.name ?? raw.id,
        rules,
        conflictPolicy: raw.conflictPolicy ?? "block",
        difficulty: raw.difficulty ?? 1,
        initialActive: raw.initialActive ?? Math.min(2, rules.length),
        revealEvery: raw.revealEvery ?? 8,
      }
    : null;

  // 若策略为 block 且有冲突 → 视为错误，阻止进入
  if (ruleSet && ruleSet.conflictPolicy === "block" && conflicts.length > 0) {
    errors.push(`同优先级冲突，禁止进入游戏：${conflicts.map((c) => c.join("×")).join(", ")}`);
    return { ruleset: null, errors, conflicts };
  }

  return { ruleset: ruleSet, errors, conflicts };
}
