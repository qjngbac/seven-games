import { describe, it, expect } from "vitest";
import { validateContent, validateEvent } from "./schema";
import { CONTENT, CONTENT_ERRORS, CONTENT_STATS } from "./index";
import { RELATIONS } from "./world";
import type { ContentPack, EventDef } from "../core/types";

describe("内容校验", () => {
  it("内置事件全部通过校验（无非法事件）", () => {
    expect(CONTENT_ERRORS).toEqual([]);
    expect(CONTENT_STATS.kept).toBe(CONTENT_STATS.total);
    expect(CONTENT.events.length).toBeGreaterThanOrEqual(20);
  });

  it("至少包含 4 条事件链（标签门控的后续事件）", () => {
    const chained = CONTENT.events.filter((e) =>
      e.conditions?.requiredTags && e.conditions.requiredTags.length > 0
    );
    expect(chained.length).toBeGreaterThanOrEqual(4);
  });

  it("校验能抓出缺少选项 id / 未知资源的事件", () => {
    const bad: EventDef = {
      id: "bad_001",
      category: "t",
      weight: 1,
      title: "坏事件",
      body: "b",
      choices: [
        { id: "", text: "x", effects: [{ type: "resource", target: "ghost", value: 1 }], resultText: "r" },
      ],
    };
    const ctx = { relations: RELATIONS.map((r) => r.id), eventIds: new Set(["bad_001"]) };
    const errs = validateEvent(bad, ctx);
    expect(errs.length).toBeGreaterThan(0);
    expect(errs.join(" ")).toMatch(/选项缺 id|未知资源/);
  });

  it("校验拒绝选项不足 2 个的事件", () => {
    const few: EventDef = {
      id: "few_001",
      category: "t",
      weight: 1,
      title: "t",
      body: "b",
      choices: [{ id: "a", text: "x", effects: [{ type: "resource", target: "money", value: 1 }], resultText: "r" }],
    };
    const ctx = { relations: RELATIONS.map((r) => r.id), eventIds: new Set(["few_001"]) };
    expect(validateEvent(few, ctx).some((e) => e.includes("选项不足"))).toBe(true);
  });

  it("validateContent 能识别重复 id", () => {
    const dup: ContentPack = {
      resources: CONTENT.resources,
      relations: CONTENT.relations,
      traits: CONTENT.traits,
      events: [
        { id: "same", category: "t", weight: 1, title: "a", body: "b", choices: [{ id: "c", text: "x", effects: [{ type: "resource", target: "money", value: 1 }], resultText: "r" }] },
        { id: "same", category: "t", weight: 1, title: "a", body: "b", choices: [{ id: "c", text: "x", effects: [{ type: "resource", target: "money", value: 1 }], resultText: "r" }] },
      ],
    };
    const { errors } = validateContent(dup);
    expect(errors.some((e) => e.includes("重复"))).toBe(true);
  });
});
