import { describe, it, expect } from "vitest";
import type { Puzzle } from "./ast";
import { solve, answerMatchesSolution } from "./solver";

function base(over: Partial<Puzzle>): Puzzle {
  return {
    id: "t",
    title: "t",
    scene: "",
    roles: ["normal", "impostor"],
    roleLabels: { normal: "正常人", impostor: "伪装者" },
    constraints: [
      { type: "exactRoleCount", role: "impostor", count: 1 },
      { type: "exactTrueStatements", count: 1 },
    ],
    characters: [
      { id: "A", name: "甲" },
      { id: "B", name: "乙" },
      { id: "C", name: "丙" },
    ],
    statements: [],
    ...over,
  };
}

describe("solve", () => {
  it("无解：约束要求恰好1伪装者但所有人都声明自己正常且互相指控导致矛盾", () => {
    // 构造真正的无解：3 人却要 2 伪装者 + 2 正常 = 4 人，不可能
    const none = base({
      constraints: [
        { type: "exactRoleCount", role: "impostor", count: 2 },
        { type: "exactRoleCount", role: "normal", count: 2 },
      ],
      characters: [
        { id: "A", name: "甲" },
        { id: "B", name: "乙" },
        { id: "C", name: "丙" },
      ],
    });
    const r = solve(none);
    // 3 人却要 2 伪装者 + 2 正常 = 4 人，不可能
    expect(r.status).toBe("none");
  });

  it("多解：对称指控且恰好1真（文档示例即此情况）", () => {
    const p = base({
      statements: [
        { id: "sA", speaker: "A", text: "", expr: { op: "roleIs", character: "B", role: "impostor" } },
        { id: "sB", speaker: "B", text: "", expr: { op: "not", arg: { op: "roleIs", character: "C", role: "impostor" } } },
        { id: "sC", speaker: "C", text: "", expr: { op: "eqTruth", left: "sA", right: "sB" } },
      ],
    });
    const r = solve(p);
    expect(r.status).toBe("multiple");
    expect(r.solutions.length).toBeGreaterThan(1);
  });

  it("唯一解：线性指控 + 末位自称正常（恰好2真）", () => {
    const p = base({
      constraints: [
        { type: "exactRoleCount", role: "impostor", count: 1 },
        { type: "exactTrueStatements", count: 2 },
      ],
      statements: [
        { id: "sA", speaker: "A", text: "", expr: { op: "roleIs", character: "B", role: "impostor" } },
        { id: "sB", speaker: "B", text: "", expr: { op: "roleIs", character: "C", role: "impostor" } },
        { id: "sC", speaker: "C", text: "", expr: { op: "roleIs", character: "C", role: "normal" } },
      ],
    });
    const r = solve(p);
    expect(r.status).toBe("unique");
    expect(r.solutions[0].roles.B).toBe("impostor");
  });

  it("answerMatchesSolution 判定过关", () => {
    const p = base({
      constraints: [
        { type: "exactRoleCount", role: "impostor", count: 1 },
        { type: "exactTrueStatements", count: 2 },
      ],
      statements: [
        { id: "sA", speaker: "A", text: "", expr: { op: "roleIs", character: "B", role: "impostor" } },
        { id: "sB", speaker: "B", text: "", expr: { op: "roleIs", character: "C", role: "impostor" } },
        { id: "sC", speaker: "C", text: "", expr: { op: "roleIs", character: "C", role: "normal" } },
      ],
    });
    expect(answerMatchesSolution(p, { A: "normal", B: "impostor", C: "normal" })).toBe(true);
    expect(answerMatchesSolution(p, { A: "impostor", B: "normal", C: "normal" })).toBe(false);
  });
});
