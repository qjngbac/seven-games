// 评分：基于用时、提示次数、错误次数。纯函数，便于测试与结算复用。
export interface ScoreInput {
  timeMs: number;
  hintsUsed: number;
  errors: number;
}

export interface ScoreResult {
  score: number;
  stars: 1 | 2 | 3;
  breakdown: { base: number; timePenalty: number; hintPenalty: number; errorPenalty: number };
}

const BASE = 1000;
const TIME_SOFT = 90_000; // 90 秒内不扣时间分
const TIME_MAX_PENALTY = 300;
const HINT_PENALTY = 120;
const ERROR_PENALTY = 80;

export function computeScore(input: ScoreInput): ScoreResult {
  const timePenalty = Math.min(
    TIME_MAX_PENALTY,
    Math.max(0, Math.floor((input.timeMs - TIME_SOFT) / 1000) * 5),
  );
  const hintPenalty = input.hintsUsed * HINT_PENALTY;
  const errorPenalty = input.errors * ERROR_PENALTY;
  const score = Math.max(0, BASE - timePenalty - hintPenalty - errorPenalty);
  let stars: 1 | 2 | 3 = 1;
  if (score >= 850 && input.errors === 0 && input.hintsUsed <= 1) stars = 3;
  else if (score >= 600) stars = 2;
  return {
    score,
    stars,
    breakdown: { base: BASE, timePenalty, hintPenalty, errorPenalty },
  };
}
