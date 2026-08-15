import { describe, it, expect } from "vitest";
import { Rng } from "./rng";

describe("Rng 可复现随机", () => {
  it("同 seed 产生完全相同的序列", () => {
    const a = new Rng(12345);
    const b = new Rng(12345);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("不同 seed 通常产生不同序列", () => {
    const a = new Rng(1);
    const b = new Rng(2);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it("state 可被保存与恢复（存档重放）", () => {
    const r = new Rng(999);
    for (let i = 0; i < 5; i++) r.next();
    const snap = r.state;
    const mid = r.next();
    const r2 = new Rng(1);
    r2.state = snap;
    expect(r2.next()).toEqual(mid);
  });

  it("weighted 在权重全 0 时返回 null", () => {
    const r = new Rng(7);
    expect(r.weighted([{ item: "x", weight: 0 }])).toBeNull();
  });

  it("weighted 在多项中按权重分布粗略合理", () => {
    const r = new Rng(42);
    const counts: Record<string, number> = { a: 0, b: 0 };
    for (let i = 0; i < 2000; i++) {
      const x = r.weighted([
        { item: "a", weight: 9 },
        { item: "b", weight: 1 },
      ]);
      counts[x as string]++;
    }
    expect(counts.a).toBeGreaterThan(counts.b);
  });
});
