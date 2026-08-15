import { describe, it, expect } from "vitest";
import type { Puzzle } from "../../logic/ast";
import { ReasoningBoard } from "./board";

const puzzle: Puzzle = {
  id: "b",
  title: "b",
  scene: "",
  roles: ["normal", "impostor"],
  roleLabels: { normal: "老实人", impostor: "伪装者" },
  constraints: [{ type: "exactRoleCount", role: "impostor", count: 1 }],
  characters: [
    { id: "A", name: "甲" },
    { id: "B", name: "乙" },
    { id: "C", name: "丙" },
  ],
  statements: [{ id: "sA", speaker: "A", text: "", expr: { op: "roleIs", character: "B", role: "impostor" } }],
};

describe("ReasoningBoard", () => {
  it("标记与撤销", () => {
    const b = new ReasoningBoard(puzzle);
    b.markCharacter("A", "impostor");
    expect(b.getCharacterMark("A")).toBe("impostor");
    b.undo();
    expect(b.getCharacterMark("A")).toBeNull();
  });

  it("清空", () => {
    const b = new ReasoningBoard(puzzle);
    b.markCharacter("A", "normal");
    b.markStatement("sA", true);
    b.clear();
    expect(b.getCharacterMark("A")).toBeNull();
    expect(b.getStatementMark("sA")).toBeNull();
  });

  it("exactRoleCount 自动推导：剩 1 未知且需 1 伪装者 → 自动填满", () => {
    const b = new ReasoningBoard(puzzle);
    b.markCharacter("A", "normal");
    b.markCharacter("B", "normal");
    // C 必为伪装者
    expect(b.getCharacterMark("C")).toBe("impostor");
  });

  it("canUndo 在初始为 false", () => {
    const b = new ReasoningBoard(puzzle);
    expect(b.canUndo).toBe(false);
    b.markCharacter("A", "normal");
    expect(b.canUndo).toBe(true);
  });
});
