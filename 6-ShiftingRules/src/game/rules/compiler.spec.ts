import { describe, it, expect } from "vitest";
import { compilePredicate, compileRuleSet, isConflictPair } from "./compiler";
import type { Rule } from "./schema";

describe("compilePredicate (简写 → 规范化)", () => {
  it("color 简写", () => {
    expect(compilePredicate({ color: "red" })).toEqual({ kind: "match", field: "color", op: "eq", value: "red" });
  });
  it("numberIsEven / numberIsOdd", () => {
    expect(compilePredicate({ numberIsEven: true })).toEqual({ kind: "match", field: "number", op: "even" });
    expect(compilePredicate({ numberIsOdd: true })).toEqual({ kind: "match", field: "number", op: "odd" });
  });
  it("and / or / not 简写", () => {
    expect(compilePredicate({ all: [{ color: "red" }, { character: "cat" }] })).toEqual({
      kind: "and",
      items: [
        { kind: "match", field: "color", op: "eq", value: "red" },
        { kind: "match", field: "character", op: "eq", value: "cat" },
      ],
    });
  });
});

describe("isConflictPair (同优先级冲突)", () => {
  const r = (id: string, field: any, value: any, action: any, priority: number): Rule => ({
    id,
    predicate: { kind: "match", field, op: "eq", value },
    action,
    priority,
    text: id,
  });
  it("同色互斥 → 不冲突", () => {
    expect(isConflictPair(r("a", "color", "red", "LEFT", 10), r("b", "color", "blue", "RIGHT", 10))).toBe(false);
  });
  it("同优先级同字段不同值且动作不同 → 冲突", () => {
    expect(isConflictPair(r("a", "color", "red", "LEFT", 10), r("b", "color", "red", "RIGHT", 10))).toBe(true);
  });
  it("不同优先级 → 不冲突", () => {
    expect(isConflictPair(r("a", "color", "red", "LEFT", 10), r("b", "color", "blue", "RIGHT", 20))).toBe(false);
  });
  it("同优先级同动作(都左) → 不冲突", () => {
    expect(isConflictPair(r("a", "color", "red", "LEFT", 10), r("b", "shape", "star", "LEFT", 10))).toBe(false);
  });
});

describe("compileRuleSet", () => {
  it("缺少展示文本被拒", () => {
    const res = compileRuleSet({
      id: "x",
      name: "x",
      rules: [{ id: "a", predicate: { color: "red" }, action: "LEFT", priority: 10 } as any],
    });
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.ruleset).toBeNull();
  });
  it("合法包通过", () => {
    const res = compileRuleSet({
      id: "ok",
      name: "ok",
      rules: [
        { id: "a", predicate: { color: "red" }, action: "LEFT", priority: 10, text: "红左" },
        { id: "b", predicate: { color: "blue" }, action: "RIGHT", priority: 10, text: "蓝右" },
      ],
    });
    expect(res.ruleset).not.toBeNull();
    expect(res.errors).toHaveLength(0);
  });
});
