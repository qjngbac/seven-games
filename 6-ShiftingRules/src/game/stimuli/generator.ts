/**
 * 受约束刺激生成器 (StimulusGenerator，文档 §3.1 / §6.4)。
 * 职责：根据当前规则集生成「有意义且唯一可判定」的刺激；不决定 UI 动画、不解析规则文本。
 *
 * 关键保证：
 *  - 先「瞄准」一条目标规则并构造满足它的刺激，保证本轮至少有一条规则命中（不会无聊到全 SKIP）；
 *  - 再附加 0-2 个随机干扰字段，自然产生规则组合（如 红 + 猫 → 反转）；
 *  - 若最终动作仍是 SKIP（仅反转规则命中而无基础规则），补一条基础规则特征，避免无效回合。
 */
import type { Predicate, Rule, Stimulus, StimField, MatchOp } from "../rules/schema";
import type { Rng } from "../rng";
import { evaluate } from "../rules/evaluator";
import { COLORS, SHAPES, CHARS, ALL_WORDS, NUMBER_MIN, NUMBER_MAX, FLAGS, randomStimulus } from "./space";

export interface GenOptions {
  /** 优先让这条规则命中（用于覆盖度/教学） */
  targetRuleId?: string;
  /** 是否允许最终动作为 SKIP 的回合（默认不允许，除非包里本就只有反转规则） */
  allowSkip?: boolean;
}

function merge(a: Stimulus, b: Stimulus): Stimulus {
  return { ...a, ...b };
}

function satisfyLeaf(field: StimField, op: MatchOp, value: string | number | undefined, rng: Rng): Stimulus {
  switch (field) {
    case "color": {
      if (op === "eq") return { color: value as any };
      if (op === "neq") return { color: rng.pick(COLORS.filter((c) => c !== value)) };
      return { color: rng.pick(COLORS) };
    }
    case "word": {
      if (op === "eq") return { word: String(value) };
      if (op === "neq") return { word: rng.pick(ALL_WORDS.filter((w) => w !== value)) };
      return { word: rng.pick(ALL_WORDS) };
    }
    case "number": {
      if (op === "even") return { number: rng.range(0, 49) * 2 };
      if (op === "odd") return { number: rng.range(0, 49) * 2 + 1 };
      if (op === "eq" && typeof value === "number") return { number: value };
      if (op === "gt" && typeof value === "number") return { number: Math.min(NUMBER_MAX, value + 1 + rng.int(20)) };
      if (op === "lt" && typeof value === "number") return { number: Math.max(NUMBER_MIN, rng.int(Math.max(0, value - 1))) };
      return { number: rng.range(NUMBER_MIN, NUMBER_MAX) };
    }
    case "shape": {
      if (op === "eq") return { shape: value as any };
      if (op === "neq") return { shape: rng.pick(SHAPES.filter((s) => s !== value)) };
      return { shape: rng.pick(SHAPES) };
    }
    case "character": {
      if (op === "eq") return { character: value as any };
      if (op === "neq") return { character: rng.pick(CHARS.filter((c) => c !== value)) };
      return { character: rng.pick(CHARS) };
    }
    case "flags": {
      if (op === "includes") return { flags: [String(value)] };
      return { flags: [rng.pick(FLAGS)] };
    }
  }
}

function satisfyNot(item: Predicate, rng: Rng): Stimulus {
  if (item.kind === "match") {
    // 取反：构造一个让该叶子为假的赋值
    if (item.field === "color" && item.op === "eq") return { color: rng.pick(COLORS.filter((c) => c !== item.value)) };
    if (item.field === "color" && item.op === "neq") return { color: item.value as any };
    if (item.field === "word" && item.op === "eq") return { word: rng.pick(ALL_WORDS.filter((w) => w !== item.value)) };
    if (item.field === "word" && item.op === "neq") return { word: String(item.value) };
    if (item.field === "number" && item.op === "even") return { number: rng.range(0, 49) * 2 + 1 };
    if (item.field === "number" && item.op === "odd") return { number: rng.range(0, 49) * 2 };
    if (item.field === "shape" && item.op === "eq") return { shape: rng.pick(SHAPES.filter((s) => s !== item.value)) };
    if (item.field === "character" && item.op === "eq") return { character: rng.pick(CHARS.filter((c) => c !== item.value)) };
    if (item.field === "flags" && item.op === "includes") return {};
  }
  // 复合否定：保守返回一个随机刺激
  return randomStimulus(rng);
}

/** 递归构造一个使谓词为真的刺激 */
export function satisfy(p: Predicate, rng: Rng): Stimulus {
  switch (p.kind) {
    case "always":
      return {};
    case "match":
      return satisfyLeaf(p.field, p.op, p.value, rng);
    case "and":
      return p.items.reduce<Stimulus>((acc, it) => merge(acc, satisfy(it, rng)), {});
    case "or":
      return satisfy(rng.pick(p.items), rng);
    case "not":
      return satisfyNot(p.item, rng);
  }
}

function addRandomFeature(s: Stimulus, rng: Rng): void {
  const candidates: StimField[] = ["word", "number", "shape", "character"];
  const open = candidates.filter((f) => s[f] === undefined);
  if (open.length === 0) return;
  const f = rng.pick(open);
  if (f === "word") s.word = rng.pick(ALL_WORDS);
  else if (f === "number") s.number = rng.range(NUMBER_MIN, NUMBER_MAX);
  else if (f === "shape") s.shape = rng.pick(SHAPES);
  else if (f === "character") s.character = rng.pick(CHARS);
}

/** 主生成函数 */
export function generateStimulus(rng: Rng, rules: Rule[], opts: GenOptions = {}): Stimulus {
  let target: Rule | undefined;
  if (opts.targetRuleId) target = rules.find((r) => r.id === opts.targetRuleId);
  if (!target) {
    const base = rules.filter((r) => r.action !== "INVERT_BASE");
    target = rng.pick(base.length ? base : rules);
  }

  const s = satisfy(target.predicate, rng);

  // 附加干扰字段，制造组合与视觉噪声
  const extra = rng.int(3); // 0~2
  for (let i = 0; i < extra; i++) addRandomFeature(s, rng);

  // 防止出现「无规则命中 → SKIP」的无聊回合
  if (!opts.allowSkip) {
    let guard = 0;
    while (evaluate(s, rules).action === "SKIP" && guard < 6) {
      const baseRules = rules.filter((r) => r.action === "LEFT" || r.action === "RIGHT");
      if (baseRules.length === 0) break;
      const br = rng.pick(baseRules);
      const add = satisfy(br.predicate, rng);
      Object.assign(s, add);
      guard++;
    }
  }

  return s;
}
