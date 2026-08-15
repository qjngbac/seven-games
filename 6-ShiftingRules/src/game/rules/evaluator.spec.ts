import { describe, it, expect } from "vitest";
import type { Rule, Stimulus } from "./schema";
import { evaluate, reduce, matchPredicate, resolveAction, DEFAULT_ACTION } from "./evaluator";

function rule(id: string, field: any, op: any, value: any, action: any, priority: number): Rule {
  return {
    id,
    predicate: { kind: "match", field, op, value },
    action,
    priority,
    text: id,
  };
}

describe("reduce (组合归约)", () => {
  it("设定型动作直接覆盖", () => {
    expect(reduce("SKIP", "LEFT")).toBe("LEFT");
    expect(reduce("LEFT", "RIGHT")).toBe("RIGHT");
    expect(reduce("RIGHT", "SKIP")).toBe("SKIP");
  });
  it("INVERT_BASE 互换 LEFT/RIGHT，SKIP 不变", () => {
    expect(reduce("LEFT", "INVERT_BASE")).toBe("RIGHT");
    expect(reduce("RIGHT", "INVERT_BASE")).toBe("LEFT");
    expect(reduce("SKIP", "INVERT_BASE")).toBe("SKIP");
  });
});

describe("matchPredicate", () => {
  it("相等/不等/奇偶/包含", () => {
    expect(matchPredicate({ kind: "match", field: "color", op: "eq", value: "red" }, { color: "red" })).toBe(true);
    expect(matchPredicate({ kind: "match", field: "color", op: "eq", value: "red" }, { color: "blue" })).toBe(false);
    expect(matchPredicate({ kind: "match", field: "number", op: "even" }, { number: 8 })).toBe(true);
    expect(matchPredicate({ kind: "match", field: "number", op: "odd" }, { number: 7 })).toBe(true);
    expect(matchPredicate({ kind: "match", field: "flags", op: "includes", value: "glow" }, { flags: ["glow"] })).toBe(true);
  });
  it("and / or / not", () => {
    const redCat: Rule["predicate"] = {
      kind: "and",
      items: [
        { kind: "match", field: "color", op: "eq", value: "red" },
        { kind: "match", field: "character", op: "eq", value: "cat" },
      ],
    };
    expect(matchPredicate(redCat, { color: "red", character: "cat" })).toBe(true);
    expect(matchPredicate(redCat, { color: "red" })).toBe(false);
    const notRed: Rule["predicate"] = { kind: "not", item: { kind: "match", field: "color", op: "eq", value: "red" } };
    expect(matchPredicate(notRed, { color: "blue" })).toBe(true);
    expect(matchPredicate(notRed, { color: "red" })).toBe(false);
  });
});

describe("evaluate (文档 §5.1 / §7.4 示例：红色猫 → 右)", () => {
  const redLeft = rule("red_left", "color", "eq", "red", "LEFT", 10);
  const catInvert = rule("cat_invert", "character", "eq", "cat", "INVERT_BASE", 100);

  it("红猫：先红→左，再被猫反转→右", () => {
    const s: Stimulus = { color: "red", character: "cat" };
    const r = evaluate(s, [redLeft, catInvert]);
    expect(r.action).toBe("RIGHT");
    expect(r.trace.map((t) => t.ruleId)).toEqual(["red_left", "cat_invert"]);
  });

  it("仅猫：反转作用于默认 SKIP → 仍是 SKIP", () => {
    expect(resolveAction({ character: "cat" }, [catInvert])).toBe("SKIP");
  });

  it("无规则命中 → 默认 SKIP", () => {
    expect(resolveAction({}, [redLeft])).toBe(DEFAULT_ACTION);
  });

  it("同优先级基础规则不冲突（颜色互斥）", () => {
    const blueRight = rule("blue_right", "color", "eq", "blue", "RIGHT", 10);
    expect(resolveAction({ color: "red" }, [redLeft, blueRight])).toBe("LEFT");
    expect(resolveAction({ color: "blue" }, [redLeft, blueRight])).toBe("RIGHT");
  });

  it("文字优先 (Stroop)：红底写「蓝」→ 按右", () => {
    const wordBlue = rule("word_blue", "word", "eq", "蓝", "RIGHT", 60);
    const s: Stimulus = { color: "red", word: "蓝" };
    expect(resolveAction(s, [redLeft, wordBlue])).toBe("RIGHT");
  });
});
