import { describe, it, expect } from "vitest";
import { createInitialState } from "./state";
import { Rng } from "./rng";
import { choose, beginDay, isDayComplete, endDay, evaluateEnding, drawNextEvent } from "./game";
import { choiceAvailable } from "./eventSelector";
import { CONTENT } from "../data";
import type { GameState } from "./types";

/** 复刻 store 的流程：每天 beginDay → 抽事件 → 选首个可用选项 → 日终 endDay。 */
function autoPlay(seed: number, trait: string | null = null): GameState {
  const s = createInitialState(seed, CONTENT, trait);
  const rng = new Rng(seed);
  beginDay(s, CONTENT); // 第 1 天开始
  let guard = 0;
  while (!s.ending && guard++ < 2000) {
    const ev = drawNextEvent(s, CONTENT, rng);
    if (!ev) {
      s.eventsDoneToday = s.eventsPerDay; // 兜底：无候选则结束当天
    } else {
      const c = ev.choices.find((x) => choiceAvailable(x, s, CONTENT))!;
      choose(s, CONTENT, ev, c);
      const e = evaluateEnding(s, CONTENT);
      if (e && e.kind === "lose") {
        s.ending = e.key;
        s.endingKind = "lose";
        break;
      }
    }
    if (isDayComplete(s)) {
      endDay(s, CONTENT);
      if (s.ending) break;
      else beginDay(s, CONTENT);
    }
  }
  return s;
}

describe("Game 流程", () => {
  it("createInitialState 应用开局特质", () => {
    const base = createInitialState(1, CONTENT, null);
    const vet = createInitialState(1, CONTENT, "veteran");
    expect(vet.resources.money).toBe(base.resources.money + 10);
    expect(vet.unlockedTraits).toContain("veteran");
  });

  it("choose 累加当日事件计数", () => {
    const s = createInitialState(1, CONTENT, null);
    const rng = new Rng(1);
    beginDay(s, CONTENT);
    const ev = drawNextEvent(s, CONTENT, rng)!;
    const c = ev.choices.find((x) => choiceAvailable(x, s, CONTENT))!;
    choose(s, CONTENT, ev, c);
    expect(s.eventsDoneToday).toBe(1);
  });

  it("ending 在资源越界时触发（破产）", () => {
    const s = createInitialState(1, CONTENT, null);
    s.resources.money = 0;
    const e = evaluateEnding(s, CONTENT);
    expect(e?.kind).toBe("lose");
    expect(e?.key).toBe("money");
  });

  it("ending 在撑过天数时通关", () => {
    const s = createInitialState(1, CONTENT, null);
    s.day = s.maxDays + 1;
    const e = evaluateEnding(s, CONTENT);
    expect(e?.kind).toBe("win");
  });

  it("beginDay 重置当日计数，同一天不产生重复快照、跨天才新增", () => {
    const s = createInitialState(1, CONTENT, null);
    expect(s.history).toHaveLength(1);
    beginDay(s, CONTENT);
    expect(s.eventsDoneToday).toBe(0);
    expect(s.history, "同一天重复 beginDay 不应产生重复快照").toHaveLength(1);
    s.day += 1;
    beginDay(s, CONTENT);
    expect(s.history.map((h) => h.day)).toEqual([1, 2]);
  });

  it("首日快照必须包含开局特质带来的数值变化", () => {
    const plain = createInitialState(7, CONTENT, null);
    const veteran = createInitialState(7, CONTENT, "veteran");
    expect(veteran.resources.money).toBe(plain.resources.money + 10);
    expect(veteran.history[0].resources.money, "首日快照不应漏掉开局特质").toBe(veteran.resources.money);
  });

  it("完整对局必然终止并产生结局", () => {
    const s = autoPlay(12345);
    expect(s.ending).not.toBeNull();
    expect(s.endingKind).toBeTruthy();
  });

  it("同 seed 产生完全相同的对局（可重放）", () => {
    const a = autoPlay(12345);
    const b = autoPlay(12345);
    expect(a.choiceLog.map((c) => c.eventId + "/" + c.choiceId)).toEqual(
      b.choiceLog.map((c) => c.eventId + "/" + c.choiceId)
    );
    expect(a.ending).toBe(b.ending);
    expect(a.resources).toEqual(b.resources);
  });

  it("不同 seed 通常走出不同对局", () => {
    const a = autoPlay(111);
    const b = autoPlay(222);
    expect(a.choiceLog.map((c) => c.eventId + "/" + c.choiceId)).not.toEqual(
      b.choiceLog.map((c) => c.eventId + "/" + c.choiceId)
    );
  });
});
