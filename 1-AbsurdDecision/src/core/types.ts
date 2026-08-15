// 纯类型定义层：不依赖任何 DOM，可在 Node 与浏览器通用。
// 设计原因：规则层必须可单元测试、可服务端复用，因此所有"业务数据形态"集中在此。

export type ResourceKey = "money" | "reputation" | "spirit" | "techDebt";

/** 资源区间等级：稳定 / 警告 / 危险 / 临界。techDebt 为反向资源（越高越糟）。 */
export type Band = "stable" | "warning" | "danger" | "critical";

export interface ResourceDef {
  key: ResourceKey;
  name: string;
  icon: string;
  /** 数值下限（钳制用） */
  min: number;
  /** 数值上限（钳制用） */
  max: number;
  /** 初始值 */
  start: number;
  /** 反向资源：数值越高越糟（techDebt）。用于区间映射与失败判定。 */
  invert?: boolean;
  /**
   * 区间阈值（升序）。例如 [20,40,60]：
   *  - 正向资源：>=60 stable, 40-59 warning, 20-39 danger, <20 critical
   *  - 反向资源：>=60 critical, 40-59 danger, 20-39 warning, <20 stable
   */
  bands: [number, number, number];
  /** 跌破/突破该值触发失败结局 */
  failAt: number;
}

/** 失败判定方向：低于 failAt（正向）或高于 failAt（反向）。 */
export function failDirection(def: ResourceDef): "below" | "above" {
  return def.invert ? "above" : "below";
}

// ---------- 事件 / 选择 / 效果 ----------

export type EffectType =
  | "resource" // 改数值
  | "tag" // 增加/移除标签
  | "relation" // 角色关系变化
  | "schedule" // 预约未来事件（延迟效果）
  | "unlock"; // 解锁内容（图鉴/特质）

export interface EffectDef {
  type: EffectType;
  /** resource/relation 的目标键；tag/unlock 的目标名 */
  target: string;
  /** resource: 增量值；tag: true=加 false=移除；relation: 增量；schedule: 延迟天数偏移；unlock: 忽略 */
  value?: number | boolean | string;
  /** schedule 专用：要预约触发的事件 id */
  eventId?: string;
  /** 人类可读说明（校验日志/调试用） */
  note?: string;
}

export interface ChoiceDef {
  id: string;
  text: string;
  /** 即时效果（选择后立即结算） */
  effects: EffectDef[];
  /** 选择后的结果文案（必须能解释主要数值变化） */
  resultText: string;
  /** 延迟效果：在满足 daysLater 天后作为未来事件结算 */
  delayed?: {
    daysLater: number;
    effects: EffectDef[];
    /** 延迟结算时的提示文案 */
    note: string;
  };
  /** 前置条件：不满足则该选项不可选（必须保证事件仍有可选项） */
  requires?: EventCondition;
  /** 隐藏真相提示（仅用于内容自检，不展示给玩家） */
  hidden?: string;
}

export interface EventCondition {
  dayMin?: number;
  dayMax?: number;
  requiredTags?: string[];
  forbiddenTags?: string[];
  /** 资源区间要求：资源名 -> [min,max] 闭区间 */
  resourceRange?: Partial<Record<ResourceKey, [number, number]>>;
  /** 仅在这些天（按周几 1-5）出现 */
  weekdays?: number[];
}

export interface EventDef {
  id: string;
  category: string;
  /** 基础权重 */
  weight: number;
  /** 剧情优先级倍率（关键剧情事件 > 普通随机） */
  priority?: number;
  conditions?: EventCondition;
  /** 互斥事件：若这些事件近期已出现则本事件降权 */
  mutexTags?: string[];
  title: string;
  body: string;
  /** 玩家可见线索（区别于隐藏真相） */
  clues?: string[];
  choices: ChoiceDef[];
  /** 内容自检用：本事件考验的判断点、搞笑点、后续钩子 */
  meta?: {
    testsJudgment?: boolean;
    funny?: string;
    hook?: string;
  };
}

// ---------- 游戏状态 ----------

export interface RelationDef {
  id: string;
  name: string;
  icon: string;
}

export interface ScheduledEffect {
  id: string;
  dueDay: number;
  effects: EffectDef[];
  note: string;
  /** 来源事件 id（用于日志/回溯） */
  source: string;
}

export interface ChoiceLogEntry {
  day: number;
  eventId: string;
  eventTitle: string;
  choiceId: string;
  choiceText: string;
  resultText: string;
  resourceDelta: Partial<Record<ResourceKey, number>>;
}

export interface GameState {
  version: number;
  seed: number;
  rngState: number;
  // 进度
  day: number;
  eventsPerDay: number;
  eventsDoneToday: number;
  maxDays: number;
  // 数值
  resources: Record<ResourceKey, number>;
  tags: string[];
  relations: Record<string, number>;
  // 抽取控制
  recentHistory: string[];
  categoryFatigue: Record<string, number>;
  // 延迟效果
  schedule: ScheduledEffect[];
  // 结算/解锁
  unlocked: string[];
  unlockedTraits: string[];
  // 结局
  ending: string | null;
  endingKind: "win" | "lose" | null;
  /** 当前正在展示的事件 id（用于存档恢复时重建 EVENT_PRESENT） */
  currentEventId: string | null;
  /** 进入当天时结算的延迟效果提示（用于 DAY_START 展示与存档恢复） */
  lastDueNotes: string[];
  // 整局选择链（用于日结/结算统计）
  choiceLog: ChoiceLogEntry[];
  // 统计：每个资源的历史极值点（用于曲线图）
  history: { day: number; resources: Record<ResourceKey, number> }[];
  // 玩家选择的开局特质/职业
  trait: string | null;
  createdAt: number;
}

export interface ContentPack {
  resources: ResourceDef[];
  relations: RelationDef[];
  events: EventDef[];
  traits: { id: string; name: string; desc: string; effects: EffectDef[] }[];
}
