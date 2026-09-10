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

describe("资源危机专属事件（resourceRange）与选项前置（requires）", () => {
  const crisis = (id: string): EventDef => CONTENT.events.find((e) => e.id === id)!;

  it("内容加载无错误，且危机事件已进入内容池", () => {
    expect(CONTENT.events.some((e) => e.id === "crisis_techdebt_001")).toBe(true);
    expect(CONTENT.events.some((e) => e.id === "crisis_spirit_001")).toBe(true);
    expect(CONTENT.events.some((e) => e.id === "crisis_money_001")).toBe(true);
    expect(CONTENT.events.some((e) => e.id === "crisis_reputation_001")).toBe(true);
    expect(CONTENT.events.some((e) => e.id === "crisis_burnout_001")).toBe(true);
  });

  it("技术债高时才eligible，低时不可抽到", () => {
    const s = createInitialState(1, CONTENT, null);
    s.resources.techDebt = 10;
    expect(eventEligible(crisis("crisis_techdebt_001"), s, CONTENT)).toBe(false);
    s.resources.techDebt = 80;
    expect(eventEligible(crisis("crisis_techdebt_001"), s, CONTENT)).toBe(true);
  });

  it("复合条件：技术债高且精神低才出现（凌晨告警）", () => {
    const s = createInitialState(1, CONTENT, null);
    s.day = 4;
    s.resources.techDebt = 80;
    s.resources.spirit = 60;
    expect(eventEligible(crisis("crisis_burnout_001"), s, CONTENT)).toBe(false);
    s.resources.spirit = 20;
    expect(eventEligible(crisis("crisis_burnout_001"), s, CONTENT)).toBe(true);
  });

  it("选项前置生效：没有对应标签时该选项不可选，但事件仍有其它可选项", () => {
    const s = createInitialState(1, CONTENT, null);
    s.resources.money = 5;
    const ev = crisis("crisis_money_001");
    const gated = ev.choices.find((c) => c.id === "ask_raise")!;
    expect(choiceAvailable(gated, s, CONTENT)).toBe(false);
    expect(eventEligible(ev, s, CONTENT), "仍应有其它可选项，事件不能变成死锁").toBe(true);
    s.tags.push("boss_meeting_done");
    expect(choiceAvailable(gated, s, CONTENT)).toBe(true);
  });
});

describe("资源危机专属事件（resourceRange）与选项前置（requires）", () => {
  const crisis = (id: string): EventDef => CONTENT.events.find((e) => e.id === id)!;

  it("内容加载无错误，且危机事件已进入内容池", () => {
    expect(CONTENT.events.some((e) => e.id === "crisis_techdebt_001")).toBe(true);
    expect(CONTENT.events.some((e) => e.id === "crisis_spirit_001")).toBe(true);
    expect(CONTENT.events.some((e) => e.id === "crisis_money_001")).toBe(true);
    expect(CONTENT.events.some((e) => e.id === "crisis_reputation_001")).toBe(true);
    expect(CONTENT.events.some((e) => e.id === "crisis_burnout_001")).toBe(true);
  });

  it("技术债高时才eligible，低时不可抽到", () => {
    const s = createInitialState(1, CONTENT, null);
    s.resources.techDebt = 10;
    expect(eventEligible(crisis("crisis_techdebt_001"), s, CONTENT)).toBe(false);
    s.resources.techDebt = 80;
    expect(eventEligible(crisis("crisis_techdebt_001"), s, CONTENT)).toBe(true);
  });

  it("复合条件：技术债高且精神低才出现（凌晨告警）", () => {
    const s = createInitialState(1, CONTENT, null);
    s.day = 4;
    s.resources.techDebt = 80;
    s.resources.spirit = 60;
    expect(eventEligible(crisis("crisis_burnout_001"), s, CONTENT)).toBe(false);
    s.resources.spirit = 20;
    expect(eventEligible(crisis("crisis_burnout_001"), s, CONTENT)).toBe(true);
  });

  it("选项前置生效：没有对应标签时该选项不可选，但事件仍有其它可选项", () => {
    const s = createInitialState(1, CONTENT, null);
    s.resources.money = 5;
    const ev = crisis("crisis_money_001");
    const gated = ev.choices.find((c) => c.id === "ask_raise")!;
    expect(choiceAvailable(gated, s, CONTENT)).toBe(false);
    expect(eventEligible(ev, s, CONTENT), "仍应有其它可选项，事件不能变成死锁").toBe(true);
    s.tags.push("boss_meeting_done");
    expect(choiceAvailable(gated, s, CONTENT)).toBe(true);
  });
});
