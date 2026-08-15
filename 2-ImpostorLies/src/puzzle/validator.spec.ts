import { describe, it, expect } from "vitest";
import type { Puzzle } from "../logic/ast";
import { validatePuzzle } from "./validator";

function good(): Puzzle {
  return {
    id: "g",
    title: "g",
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
      { id: "sA", speaker: "A", text: "", expr: { op: "roleIs", character: "B", role: "impostor" } },
      { id: "sB", speaker: "B", text: "", expr: { op: "roleIs", character: "C", role: "impostor" } },
      { id: "sC", speaker: "C", text: "", expr: { op: "roleIs", character: "C", role: "normal" } },
    ],
  };
}

describe("validatePuzzle", () => {
  it("合法唯一解谜题：无错误", () => {
    const issues = validatePuzzle(good());
    expect(issues.filter((i) => i.level === "error").length).toBe(0);
  });

  it("引用不存在的角色 → 错误", () => {
    const p = good();
    p.statements[0].expr = { op: "roleIs", character: "Z", role: "impostor" };
    const issues = validatePuzzle(p);
    expect(issues.some((i) => i.level === "error")).toBe(true);
  });

  it("自指自身真值 → 错误", () => {
    const p = good();
    p.statements[0].expr = { op: "not", arg: { op: "stmtTruth", statement: "sA" } };
    const issues = validatePuzzle(p);
    expect(issues.some((i) => i.message.includes("自指"))).toBe(true);
  });

  it("多解谜题 → 不满足唯一解要求 → 错误", () => {
    const p = good();
    p.constraints = [
      { type: "exactRoleCount", role: "impostor", count: 1 },
      { type: "exactTrueStatements", count: 1 },
    ];
    p.statements = [
      { id: "sA", speaker: "A", text: "", expr: { op: "roleIs", character: "B", role: "impostor" } },
      { id: "sB", speaker: "B", text: "", expr: { op: "not", arg: { op: "roleIs", character: "C", role: "impostor" } } },
      { id: "sC", speaker: "C", text: "", expr: { op: "eqTruth", left: "sA", right: "sB" } },
    ];
    const issues = validatePuzzle(p);
    expect(issues.some((i) => i.message.includes("唯一解"))).toBe(true);
  });
});
