import { describe, it, expect } from "vitest";
import type { Statement } from "./ast";
import { evaluate, computeTruth } from "./evaluator";

function stmt(id: string, speaker: string, expr: Statement["expr"]): Statement {
  return { id, speaker, text: "", expr };
}

describe("evaluate", () => {
  it("roleIs 在候选世界中计算真假", () => {
    const world = { A: "impostor", B: "normal" };
    expect(
      evaluate({ op: "roleIs", character: "A", role: "impostor" }, world, {}),
    ).toBe(true);
    expect(
      evaluate({ op: "roleIs", character: "B", role: "impostor" }, world, {}),
    ).toBe(false);
  });

  it("not / and / or 组合", () => {
    const world = { A: "normal", B: "impostor" };
    expect(
      evaluate(
        { op: "not", arg: { op: "roleIs", character: "A", role: "impostor" } },
        world,
        {},
      ),
    ).toBe(true);
    expect(
      evaluate(
        {
          op: "and",
          args: [
            { op: "roleIs", character: "A", role: "normal" },
            { op: "roleIs", character: "B", role: "impostor" },
          ],
        },
        world,
        {},
      ),
    ).toBe(true);
    expect(
      evaluate(
        {
          op: "or",
          args: [
            { op: "roleIs", character: "A", role: "impostor" },
            { op: "roleIs", character: "B", role: "impostor" },
          ],
        },
        world,
        {},
      ),
    ).toBe(true);
  });

  it("eqTruth / xorTruth 依赖其它陈述真值", () => {
    const world = { A: "normal", B: "normal", C: "impostor" };
    const truth = { s0: true, s1: true, s2: false } as Record<string, boolean>;
    expect(evaluate({ op: "eqTruth", left: "s0", right: "s1" }, world, truth)).toBe(true);
    expect(evaluate({ op: "eqTruth", left: "s0", right: "s2" }, world, truth)).toBe(false);
    expect(evaluate({ op: "xorTruth", left: "s0", right: "s2" }, world, truth)).toBe(true);
    // 依赖未定真值 → undefined
    expect(evaluate({ op: "eqTruth", left: "s0", right: "s9" }, world, { s0: true })).toBeUndefined();
  });

  it("and / or 在三值逻辑下短路：已确定的真假优先于未定项", () => {
    const world = { A: "normal", B: "impostor" };
    const undef = { op: "stmtTruth", statement: "unknown" } as const;
    // and：一项为假 → 整体为假（即便另一项未定）
    expect(
      evaluate(
        { op: "and", args: [{ op: "roleIs", character: "A", role: "impostor" }, undef] },
        world,
        {},
      ),
    ).toBe(false);
    // or：一项为真 → 整体为真（即便另一项未定）
    expect(
      evaluate(
        { op: "or", args: [{ op: "roleIs", character: "B", role: "impostor" }, undef] },
        world,
        {},
      ),
    ).toBe(true);
    // 仍然未定：and 全真但含未定 → undefined；or 全假但含未定 → undefined
    expect(
      evaluate(
        { op: "and", args: [{ op: "roleIs", character: "B", role: "impostor" }, undef] },
        world,
        {},
      ),
    ).toBeUndefined();
    expect(
      evaluate(
        { op: "or", args: [{ op: "roleIs", character: "A", role: "impostor" }, undef] },
        world,
        {},
      ),
    ).toBeUndefined();
  });
});

describe("computeTruth (fixpoint)", () => {
  it("纯角色命题立即确定", () => {
    const stmts = [
      stmt("sA", "A", { op: "roleIs", character: "B", role: "impostor" }),
      stmt("sB", "B", { op: "not", arg: { op: "roleIs", character: "C", role: "impostor" } }),
    ];
    const { truth, illformed } = computeTruth({ A: "normal", B: "normal", C: "impostor" }, stmts);
    expect(illformed).toBe(false);
    expect(truth.sA).toBe(false);
    expect(truth.sB).toBe(false);
  });

  it("eqTruth 互引可收敛", () => {
    const stmts = [
      stmt("sA", "A", { op: "roleIs", character: "B", role: "impostor" }),
      stmt("sB", "B", { op: "roleIs", character: "C", role: "impostor" }),
      stmt("sC", "C", { op: "eqTruth", left: "sA", right: "sB" }),
    ];
    const { truth, illformed } = computeTruth({ A: "normal", B: "normal", C: "impostor" }, stmts);
    expect(illformed).toBe(false);
    expect(truth.sA).toBe(false); // B 不是伪装者
    expect(truth.sB).toBe(true); // C 是伪装者
    expect(truth.sC).toBe(false); // 真假不同 → 相同为假
  });

  it("自指循环无法收敛 → illformed", () => {
    const stmts = [stmt("sA", "A", { op: "not", arg: { op: "stmtTruth", statement: "sA" } })];
    const { illformed } = computeTruth({ A: "normal" }, stmts);
    expect(illformed).toBe(true);
  });
});
