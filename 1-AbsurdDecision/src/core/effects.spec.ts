import { describe, it, expect } from "vitest";
import { applyEffects, scheduleEvent, resolveDueScheduled } from "./effects";
import { createInitialState } from "./state";
import { buildContent } from "../data/world";
import type { ContentPack, GameState } from "./types";

const content: ContentPack = buildContent([]); // 只需资源/关系定义即可测试效果

function fresh(): GameState {
  return createInitialState(1, content, null);
}

describe("EffectEngine 事务化结算", () => {
  it("资源变化被钳制到合法区间", () => {
    const s = fresh();
    s.resources.money = 98;
    const r = applyEffects(s, [{ type: "resource", target: "money", value: 10 }], content);
    expect(r.ok).toBe(true);
    expect(s.resources.money).toBe(100); // 上限 100
  });

  it("标签增删生效", () => {
    const s = fresh();
    applyEffects(s, [{ type: "tag", target: "x", value: true }], content);
    expect(s.tags).toContain("x");
    applyEffects(s, [{ type: "tag", target: "x", value: false }], content);
    expect(s.tags).not.toContain("x");
  });

  it("关系变化生效", () => {
    const s = fresh();
    applyEffects(s, [{ type: "relation", target: "boss", value: 5 }], content);
    expect(s.relations.boss).toBe(5);
  });

  it("非法效果整体回滚，不残写半截状态", () => {
    const s = fresh();
    s.resources.money = 50;
    const before = JSON.stringify(s);
    const r = applyEffects(
      s,
      [
        { type: "resource", target: "money", value: 5 },
        { type: "resource", target: "not_a_res", value: 1 }, // 非法
      ],
      content
    );
    expect(r.ok).toBe(false);
    expect(JSON.stringify(s)).toBe(before); // 完全未改动
    expect(s.resources.money).toBe(50);
  });

  it("延迟效果在到期日才结算", () => {
    const s = fresh();
    s.day = 1;
    scheduleEvent(s, "ev_src", 2, [{ type: "resource", target: "money", value: -10 }], "两天后账单", "ev_src");
    expect(s.schedule.length).toBe(1);
    // 第 1 天：未到期
    const early = resolveDueScheduled(s, content);
    expect(early.resourceDelta.money ?? 0).toBe(0);
    expect(s.schedule.length).toBe(1);
    // 第 3 天：到期
    s.day = 3;
    const late = resolveDueScheduled(s, content);
    expect(late.resourceDelta.money).toBe(-10);
    expect(s.schedule.length).toBe(0);
  });
});
