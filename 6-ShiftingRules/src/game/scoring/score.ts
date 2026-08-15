/**
 * 评分系统 (ScoreSystem，文档 §3.4)。
 * 原则：准确率主权重、速度次权重；错误先清空连击，再轻微扣分。
 * 纯函数，不依赖游戏状态对象，便于单测与回放。
 */
import type { Action } from "../rules/schema";

export interface ScoreConfig {
  /** 每轮正确基础分 */
  base: number;
  /** 快于该毫秒数开始给速度奖励 */
  fastMs: number;
  /** 速度奖励上限 */
  fastBonus: number;
  /** 每段连击的倍率增量 */
  comboStep: number;
  /** 连击倍率上限对应的连击数 */
  comboCap: number;
  /** 错误扣的分（会 floor 到 0） */
  wrongPenalty: number;
}

export const DEFAULT_SCORE: ScoreConfig = {
  base: 100,
  fastMs: 750,
  fastBonus: 90,
  comboStep: 0.1,
  comboCap: 12,
  wrongPenalty: 30,
};

export interface RoundScore {
  delta: number;
  comboAfter: number;
}

/**
 * 计算一轮的得分变化。
 * @param correct 是否正确
 * @param reactionMs 反应毫秒（超时传 timeLimit）
 * @param comboBefore 本轮之前的连击数
 */
export function scoreForRound(correct: boolean, reactionMs: number, comboBefore: number, cfg: ScoreConfig = DEFAULT_SCORE): RoundScore {
  if (!correct) {
    return { delta: -cfg.wrongPenalty, comboAfter: 0 };
  }
  const speedBonus = reactionMs <= cfg.fastMs ? Math.round(cfg.fastBonus * (1 - Math.max(0, reactionMs) / (cfg.fastMs * 2))) : 0;
  const comboMult = 1 + Math.min(comboBefore, cfg.comboCap) * cfg.comboStep;
  const gained = Math.round((cfg.base + speedBonus) * comboMult);
  return { delta: gained, comboAfter: comboBefore + 1 };
}

/** 把 delta 应用到总分（不低于 0） */
export function applyDelta(total: number, delta: number): number {
  return Math.max(0, total + delta);
}

export const ACTION_LABEL: Record<Action, string> = {
  LEFT: "左",
  RIGHT: "右",
  SKIP: "跳过",
  INVERT_BASE: "反转",
};
