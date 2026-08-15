import type { CommandRecord, SolutionTier } from './schema';

export interface ScoreSummary {
  professional: number;
  safety: number;
  comedy: number;
  cost: number;
  attempts: number;
  errors: number;
}

const TIER_BASE: Record<SolutionTier, number> = {
  professional: 1000,
  temporary: 700,
  absurd: 500,
};

export function summarize(records: CommandRecord[]): ScoreSummary {
  const s: ScoreSummary = { professional: 0, safety: 0, comedy: 0, cost: 0, attempts: records.length, errors: 0 };
  for (const r of records) {
    const sc = r.result.recipe?.scores;
    if (sc) {
      s.professional += sc.professional ?? 0;
      s.safety += sc.safety ?? 0;
      s.comedy += sc.comedy ?? 0;
      s.cost += sc.cost ?? 0;
    }
    if (r.result.kind === 'failure') s.errors += 1;
  }
  return s;
}

export function computeScore(tier: SolutionTier, s: ScoreSummary): number {
  const raw =
    TIER_BASE[tier] +
    s.comedy * 40 +
    s.safety * 30 +
    s.professional * 20 -
    s.cost * 25 -
    s.errors * 30;
  return Math.max(0, Math.round(raw));
}

/** 星级：基础由解法等级决定，失败尝试过多会扣星（最低 1 星） */
export function computeStars(tier: SolutionTier, errors: number): number {
  let stars = tier === 'professional' ? 3 : 2;
  if (errors >= 4) stars = Math.max(1, stars - 1);
  if (errors >= 10) stars = Math.max(1, stars - 1);
  return stars;
}
