import type { GameState, Solution, SolutionTier } from './schema';
import { evalPredicate } from './scene';

/** 解法等级排序权重（专业 > 临时 > 离谱）。导出以便其它模块复用同一口径。 */
export const TIER_RANK: Record<SolutionTier, number> = {
  professional: 3,
  temporary: 2,
  absurd: 1,
};

/** 返回当前满足的最高等级解法；无则 null。多解并存时取最优等级。 */
export function evaluateSolutions(solutions: Solution[], state: GameState): Solution | null {
  const matched = solutions.filter((s) => evalPredicate(s.predicate, state));
  if (matched.length === 0) return null;
  matched.sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier]);
  return matched[0];
}
