import { describe, it, expect } from "vitest";
import {
  selectEvent,
  matchesCondition,
  choiceAvailable,
  eventEligible,
  weekdayOf,
} from "./eventSelector";
import { createInitialState } from "./state";
import { CONTENT } from "../data";
import { Rng } from "./rng";
import type { EventDef } from "./types";

describe("EventSelector 条件 / 抽取", () => {
  it("weekdayOf 把天数映射到 1-5", () => {
    expect(weekdayOf(1)).toBe(1);
    expect(weekdayOf(5)).toBe(5);
    expect(weekdayOf(6)).toBe(1);
    expect(weekdayOf(7)).toBe(2);
  });

  it("matchesCondition 正确处理标签/天数/资源区间", () => {
    const s = createInitialState(1, CONTENT, null);
    expect(matchesCondition({ requiredTags: ["nope"] }, s, CONTENT)).toBe(false);
    expect(matchesCondition({ forbiddenTags: ["nope"] }, s, CONTENT)).toBe(true);
    expect(matchesCondition({ dayMin: 2 }, s, CONTENT)).toBe(false); // day=1
    expect(matchesCondition({ dayMin: 1 }, s, CONTENT)).toBe(true);
    expect(
      matchesCondition({ resourceRange: { money: [0, 10] } }, s, CONTENT)
    ).toBe(false); // money=50
    expect(
      matchesCondition({ resourceRange: { money: [40, 60] } }, s, CONTENT)
    ).toBe(true);
  });

  it("choiceAvailable 尊重选项前置条件", () => {
    const s = createInitialState(1, CONTENT, null);
    const locked: EventDef = {
      id: "x",
      category: "t",
      weight: 1,
      title: "t",
      body: "b",
      choices: [{ id: "c", text: "need tag", effects: [], resultText: "r", requires: { requiredTags: ["ghost"] } }],
    };
    expect(choiceAvailable(locked.choices[0], s, CONTENT)).toBe(false);
  });

  it("同一 seed 抽取结果可复现", () => {
    function first(): string | null {
      const s = createInitialState(1, CONTENT, null);
      const r = new Rng(777);
      return selectEvent(s, CONTENT, r)?.id ?? null;
    }
    expect(first()).toBe(first());
  });

  it("最近事件冷却：连续 6 次抽取内不重复同一事件", () => {
    const s = createInitialState(1, CONTENT, null);
    const r = new Rng(2024);
    const ids: string[] = [];
    for (let i = 0; i < 40; i++) {
      const ev = selectEvent(s, CONTENT, r);
      expect(ev).not.toBeNull();
      ids.push(ev!.id);
    }
    for (let i = 0; i < ids.length; i++) {
      const tail = ids.slice(Math.max(0, i - 5), i);
      expect(tail).not.toContain(ids[i]); // 6 格冷却窗口内不重复
    }
  });

  it("抽到的事件一定至少有一个可选选项（无死锁）", () => {
    const s = createInitialState(1, CONTENT, null);
    const r = new Rng(55);
    for (let i = 0; i < 30; i++) {
      const ev = selectEvent(s, CONTENT, r);
      expect(ev).not.toBeNull();
      if (ev) expect(eventEligible(ev, s, CONTENT)).toBe(true);
    }
  });
});
