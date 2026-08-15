import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useGame } from "./store";
import { getPuzzle } from "../puzzle/repository";
import { uniqueSolution } from "../features/hints/hints";

// 回归测试：猜错（含撤销后）计时必须继续累积，只有答对才停止。
describe("store 计时在猜错/撤销后继续累积", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("猜错后仍计时，撤销后仍计时，答对才停止", () => {
    const g = useGame();
    const pid = "ch1_01";
    const p = getPuzzle(pid)!;
    const sol = uniqueSolution(p)!;

    g.startPuzzle(pid);
    g.beginPlay();
    vi.advanceTimersByTime(1000);
    const afterStart = g.elapsedMs;
    expect(afterStart).toBeGreaterThan(0);

    // 填满为正确答案
    for (const c of p.characters) g.markCharacter(c.id, sol[c.id]);
    expect(g.canSubmit).toBe(true);

    // 故意改错一个角色，制造错误答案
    const flipId = p.characters[0].id;
    const wrongRole = sol[flipId] === "impostor" ? "normal" : "impostor";
    g.markCharacter(flipId, wrongRole);

    const beforeWrong = g.elapsedMs;
    g.submit(); // 猜错
    expect(g.errors).toBe(1);
    expect(g.lastViolation).not.toBeNull();
    expect(g.screen).toBe("PLAYING");

    vi.advanceTimersByTime(1000);
    const afterWrongTick = g.elapsedMs;
    // 关键断言：猜错后计时仍在增加
    expect(afterWrongTick).toBeGreaterThan(beforeWrong);

    // 撤销错误标记
    g.undo();
    vi.advanceTimersByTime(1000);
    const afterUndoTick = g.elapsedMs;
    // 关键断言：撤销后计时仍在增加
    expect(afterUndoTick).toBeGreaterThan(afterWrongTick);

    // 修正为正确答案并提交
    g.markCharacter(flipId, sol[flipId]);
    expect(g.canSubmit).toBe(true);
    g.submit();
    expect(g.screen).toBe("RESULT");
    expect(g.lastResult?.win).toBe(true);

    const winTime = g.elapsedMs;
    vi.advanceTimersByTime(1000);
    // 关键断言：答对后计时停止
    expect(g.elapsedMs).toBe(winTime);
  });
});

describe("store 关卡总数", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("从章节数据动态计算，扩展章节后不保留旧的固定值", () => {
    const g = useGame();
    const chapterTotal = g.chapters.reduce((total, chapter) => total + chapter.puzzleIds.length, 0);
    expect(g.totalPuzzles).toBe(chapterTotal);
    expect(g.totalPuzzles).toBe(32);
  });
});
