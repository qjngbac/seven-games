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

  it("beginDay 重置当日计数并写入历史快照", () => {
    const s = createInitialState(1, CONTENT, null);
    const before = s.history.length;
    beginDay(s, CONTENT);
    expect(s.eventsDoneToday).toBe(0);
    expect(s.history.length).toBe(before + 1);
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
