/**
 * 规则层数据模型 (文档 §5 / §6.2)。
 * 这里只放「纯数据 + 类型」，不引入任何 Phaser 或 DOM 依赖，
 * 以便规则引擎可在 node 下独立单元测试 (文档 §6.1 / §6.3)。
 */

// ---- 刺激 (Stimulus) ----
export type ColorKey = "red" | "blue" | "green" | "yellow" | "purple";
export type ShapeKey = "circle" | "square" | "triangle" | "star" | "cross";
export type CharKey = "cat" | "dog" | "robot" | "ghost" | "alien";

export interface Stimulus {
  color?: ColorKey;
  /** 显示出来的文字，可能是颜色词("红"/"蓝")也可能是无关词("香蕉") */
  word?: string;
  /** 0-99 的数字 */
  number?: number;
  shape?: ShapeKey;
  character?: CharKey;
  flags?: string[];
}

// ---- 动作 (Action) ----
/** 玩家输入/正确动作只有三种；INVERT_BASE 是「修饰型」动作，用于反转基础规则 */
export type Action = "LEFT" | "RIGHT" | "SKIP" | "INVERT_BASE";

// ---- 谓词 (Predicate) ----
export type StimField = "color" | "word" | "number" | "shape" | "character" | "flags";
export type MatchOp = "eq" | "neq" | "even" | "odd" | "gt" | "lt" | "includes";

/** 规范化后的谓词 (编译产物) */
export type Predicate =
  | { kind: "match"; field: StimField; op: MatchOp; value?: string | number }
  | { kind: "and"; items: Predicate[] }
  | { kind: "or"; items: Predicate[] }
  | { kind: "not"; item: Predicate }
  | { kind: "always" };

/** JSON 里的简写谓词：用字段名直接写等值，或仅写算子 */
export type ShorthandPredicate =
  | { color?: ColorKey; word?: string; numberIsEven?: boolean; numberIsOdd?: boolean; shape?: ShapeKey; character?: CharKey; flagsInclude?: string; all?: ShorthandPredicate[]; any?: ShorthandPredicate[]; not?: ShorthandPredicate }
  | { kind: "match"; field: StimField; op: MatchOp; value?: string | number }
  | { kind: "and"; items: ShorthandPredicate[] }
  | { kind: "or"; items: ShorthandPredicate[] }
  | { kind: "not"; item: ShorthandPredicate }
  | { kind: "always" };

// ---- 规则 (Rule) ----
export interface Rule {
  id: string;
  /** 规范化后的谓词 (由 compiler 从简写编译而来) */
  predicate: Predicate;
  action: Action;
  priority: number;
  /** 展示文本，与配置同源 (文档 §5.2：文本与执行同一来源) */
  text: string;
  /** 教学示例 (文档 §7.3) */
  example?: string;
}

// ---- 规则包 (RuleSet) ----
export interface RuleSet {
  id: string;
  name: string;
  rules: Rule[];
  conflictPolicy: "block" | "warn";
  difficulty: number;
  /** 开局直接生效的规则数量 (其余按 revealEvery 逐步揭示) */
  initialActive: number;
  /** 每多少轮揭示下一批规则 (动态规则，文档 §2.1 / M3) */
  revealEvery: number;
}

// ---- 求值结果 ----
export interface HitTrace {
  ruleId: string;
  priority: number;
  /** 该规则自身的动作 (注意：可能是修饰型 INVERT_BASE) */
  action: Action;
  text: string;
}

export interface EvalResult {
  /** 最终唯一动作 */
  action: Action;
  /** 应用顺序 (按优先级升序)；用于复盘「命中的规则 → 优先级 → 正确动作」 */
  trace: HitTrace[];
  /** 命中的规则 (按优先级升序) */
  rawMatches: Rule[];
}
