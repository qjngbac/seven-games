import { describe, it, expect } from "vitest";
import { scoreForRound, applyDelta, DEFAULT_SCORE } from "./score";

describe("scoreForRound", () => {
  it("正确且快 → 正分且连击+1", () => {
    const r = scoreForRound(true, 300, 0);
    expect(r.delta).toBeGreaterThan(0);
    expect(r.comboAfter).toBe(1);
  });
  it("错误 → 连击清零且扣分", () => {
    const r = scoreForRound(false, 0, 5);
    expect(r.comboAfter).toBe(0);
    expect(r.delta).toBe(-DEFAULT_SCORE.wrongPenalty);
  });
  it("连击越高倍率越大", () => {
    const a = scoreForRound(true, 1000, 0).delta;
    const b = scoreForRound(true, 1000, 10).delta;
    expect(b).toBeGreaterThan(a);
  });
  it("applyDelta 不低于 0", () => {
    expect(applyDelta(10, -30)).toBe(0);
    expect(applyDelta(100, 50)).toBe(150);
  });
});
