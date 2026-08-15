import { describe, it, expect } from "vitest";
import type { Puzzle } from "./ast";
import { explainViolation, generateHints, buildReasoningChain } from "./explainer";
import { solve } from "./solver";

const puzzle: Puzzle = {
  id: "e",
  title: "e",
  scene: "",
  roles: ["normal", "impostor"],
  roleLabels: { normal: "正常人", impostor: "伪装者" },
  constraints: [
    { type: "exactRoleCount", role: "impostor", count: 1 },
    { type: "exactTrueStatements", count: 2 },
  ],
  characters: [
    { id: "A", name: "甲" },
    { id: "B", name: "乙" },
    { id: "C", name: "丙" },
  ],
  statements: [
    { id: "sA", speaker: "A", text: "B 是伪装者。", expr: { op: "roleIs", character: "B", role: "impostor" } },
    { id: "sB", speaker: "B", text: "C 是伪装者。", expr: { op: "roleIs", character: "C", role: "impostor" } },
    { id: "sC", speaker: "C", text: "我是正常人。", expr: { op: "roleIs", character: "C", role: "normal" } },
  ],
};

describe("explainer", () => {
  it("错误提交：解释违反的约束", () => {
    const wrong = explainViolation(puzzle, { A: "impostor", B: "normal", C: "normal" });
    expect(wrong.ok).toBe(false);
    expect(wrong.message.length).toBeGreaterThan(0);
  });

  it("正确提交：ok 为 true", () => {
    const right = explainViolation(puzzle, { A: "normal", B: "impostor", C: "normal" });
    expect(right.ok).toBe(true);
  });

  it("generateHints 返回三级提示", () => {
    const hints = generateHints(puzzle, solve(puzzle).solutions[0].roles);
    expect(hints.length).toBe(3);
    hints.forEach((h) => expect(h.length).toBeGreaterThan(0));
  });

  it("buildReasoningChain 给出可读推导", () => {
    const chain = buildReasoningChain(puzzle, solve(puzzle).solutions[0].roles);
    expect(chain.length).toBeGreaterThan(0);
  });
});
