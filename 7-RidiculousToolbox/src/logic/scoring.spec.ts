import { describe, it, expect } from 'vitest';
import { computeScore, computeStars, summarize } from '../logic/scoring';
import type { CommandRecord, Recipe } from '../logic/schema';

const sol: Recipe = { recipeId: 'x', kind: 'use', inputs: [], outputs: [], scores: { professional: 2, safety: 1, comedy: 0, cost: 1 }, category: 'solution', feedback: '' };
const fail: Recipe = { recipeId: 'f', kind: 'combine', inputs: [], outputs: [], category: 'failure', feedback: '' };

function rec(recipe: Recipe | null): CommandRecord {
  return { before: null as never, operation: { kind: 'combine', instanceIds: [] }, after: null as never, result: { ok: true, kind: recipe?.category === 'failure' ? 'failure' : 'success', recipe: recipe ?? undefined, feedback: '', produced: [], consumed: [], sceneChanges: [], flagChanges: [] } };
}

describe('scoring：累积与星级', () => {
  it('专业解 + 0 失败 → 高分三星', () => {
    const records = [rec(sol)];
    const sum = summarize(records);
    expect(sum.errors).toBe(0);
    const score = computeScore('professional', sum);
    expect(score).toBeGreaterThan(0);
    expect(computeStars('professional', sum.errors)).toBe(3);
  });

  it('多次失败降低星級', () => {
    const records = [rec(sol), rec(fail), rec(fail), rec(fail), rec(fail), rec(fail)];
    const sum = summarize(records);
    expect(sum.errors).toBe(5);
    expect(computeStars('professional', sum.errors)).toBeLessThan(3);
  });

  it('离谱解搞笑分计入', () => {
    const abs: Recipe = { recipeId: 'abs', kind: 'use', inputs: [], outputs: [], scores: { professional: 0, safety: 0, comedy: 3, cost: 0 }, category: 'solution', feedback: '' };
    const sum = summarize([rec(abs)]);
    expect(sum.comedy).toBe(3);
  });
});
