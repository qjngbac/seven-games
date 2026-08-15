import { describe, it, expect } from "vitest";
import { computeScore } from "./scoring";

describe("computeScore", () => {
  it("完美：快速 + 无提示 + 无错误 → 3 星满分", () => {
    const r = computeScore({ timeMs: 10000, hintsUsed: 0, errors: 0 });
    expect(r.stars).toBe(3);
    expect(r.score).toBe(1000);
  });

  it("慢 + 提示 + 错误 → 扣分，星级下降", () => {
    const fast = computeScore({ timeMs: 5000, hintsUsed: 0, errors: 0 });
    const slow = computeScore({ timeMs: 200000, hintsUsed: 2, errors: 3 });
    expect(slow.score).toBeLessThan(fast.score);
    expect(slow.stars).toBeLessThan(3);
  });

  it("分数不为负", () => {
    const r = computeScore({ timeMs: 9999999, hintsUsed: 20, errors: 20 });
    expect(r.score).toBeGreaterThanOrEqual(0);
  });

  it("1 错误且 1 提示仍可拿 3 星（阈值内）", () => {
    const r = computeScore({ timeMs: 30000, hintsUsed: 1, errors: 0 });
    expect(r.stars).toBe(3);
  });
});
