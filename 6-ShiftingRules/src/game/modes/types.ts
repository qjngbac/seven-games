/**
 * 游戏模式定义 (文档 §2.2 / §2.3)。
 *  - normal：普通模式，生命耗尽或完成目标轮数结算；
 *  - zen：禅模式，无生命，只记录准确率与速度；
 *  - daily：每日挑战，固定种子便于公平排名；
 *  - practice：练习室，规则全开、错误必给讲解。
 */
export type ModeId = "normal" | "zen" | "daily" | "practice";

export interface ModeConfig {
  id: ModeId;
  name: string;
  /** 目标轮数（zen/practice 用极大值表示无限） */
  targetRounds: number;
  /** 生命数（0 = 无生命） */
  lives: number;
  /** 单轮时限（毫秒） */
  timeLimitMs: number;
  /** 是否阶段揭示新规则 */
  enableDynamicRules: boolean;
  /** 是否记录「最常错规则」统计 */
  countMistakes: boolean;
  /** 描述 */
  blurb: string;
}

export const MODES: Record<ModeId, ModeConfig> = {
  normal: {
    id: "normal",
    name: "普通模式",
    targetRounds: 30,
    lives: 3,
    timeLimitMs: 2200,
    enableDynamicRules: true,
    countMistakes: true,
    blurb: "30 轮，3 条命。规则会越加越多。",
  },
  zen: {
    id: "zen",
    name: "禅模式",
    targetRounds: 9999,
    lives: 0,
    timeLimitMs: 2400,
    enableDynamicRules: true,
    countMistakes: true,
    blurb: "没有生命，只追求准确率与速度。",
  },
  daily: {
    id: "daily",
    name: "每日挑战",
    targetRounds: 30,
    lives: 3,
    timeLimitMs: 2200,
    enableDynamicRules: true,
    countMistakes: true,
    blurb: "固定种子，所有人同一套题，可公平排名。",
  },
  practice: {
    id: "practice",
    name: "练习室",
    targetRounds: 9999,
    lives: 0,
    timeLimitMs: 3200,
    enableDynamicRules: false,
    countMistakes: true,
    blurb: "规则全开，慢慢练，每轮都给讲解。",
  },
};
