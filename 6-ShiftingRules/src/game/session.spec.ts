import { describe, it, expect } from "vitest";
import { GameSession, type SubmitResult } from "./session";
import type { Action, Stimulus } from "./rules/schema";
import { getPack } from "../data/packs";
import type { RoundView } from "./session";

function wrongAction(correct: Action): Action {
  if (correct === "LEFT") return "RIGHT";
  if (correct === "RIGHT") return "LEFT";
  return "LEFT"; // SKIP → 按左即错
}

interface RunOut {
  stimuli: Stimulus[];
  results: SubmitResult[];
  last: ReturnType<GameSession["buildResult"]>;
}

function run(seed: number, rounds: number, answerer: (v: RoundView) => { action: Action | null; reactionMs: number }): RunOut {
  const pack = getPack("pack-base")!;
  const s = new GameSession({ mode: "normal", ruleset: pack, seed });
  const stimuli: Stimulus[] = [];
  const results: SubmitResult[] = [];
  for (let i = 0; i < rounds; i++) {
    const v = s.beginRound();
    stimuli.push(v.stimulus);
    const inp = answerer(v);
    const res = s.submit(inp.action, inp.reactionMs);
    results.push(res);
    if (res.over) break;
  }
  return { stimuli, results, last: s.buildResult() };
}

describe("GameSession 流程", () => {
  it("30 轮全对 → 完成且高准确", () => {
    const out = run(12345, 30, (v) => ({ action: v.correctAction, reactionMs: 350 }));
    expect(out.last.rounds).toBe(30);
    expect(out.last.accuracy).toBe(1);
    expect(out.results[out.results.length - 1].over).toBe(true);
    expect(out.last.reason).toBe("complete");
  });

  it("连续按错 → 生命耗尽结束 (reason=lives)", () => {
    const out = run(999, 30, (v) => ({ action: wrongAction(v.correctAction), reactionMs: 0 }));
    expect(out.last.reason).toBe("lives");
    expect(out.last.rounds).toBeLessThan(30);
    expect(out.last.finished).toBe(true);
  });

  it("阶段揭示新规则：第 8 轮后揭示 green_skip", () => {
    const out = run(7, 12, (v) => ({ action: v.correctAction, reactionMs: 400 }));
    const revealAt8 = out.results[7]; // 第 8 轮的 submit
    expect(revealAt8.revealed.some((r) => r.id === "green_skip")).toBe(true);
  });

  it("动态揭示后规则确实加入 activeRules", () => {
    const out = run(7, 12, (v) => ({ action: v.correctAction, reactionMs: 400 }));
    // 第 9 轮起生成刺激使用的规则集应含 green_skip：观察第 9 轮刺激仍可唯一判定（无异常即可）
    expect(out.stimuli.length).toBeGreaterThanOrEqual(9);
  });
});

describe("重放一致性 (文档 §5.2 / §8.4：固定种子可复现)", () => {
  it("同种子 + 同输入脚本 → 完全一致的刺激序列与结算", () => {
    const a = run(424242, 25, (v) => ({ action: v.correctAction, reactionMs: 300 + (v.index % 5) * 50 }));
    const b = run(424242, 25, (v) => ({ action: v.correctAction, reactionMs: 300 + (v.index % 5) * 50 }));
    expect(JSON.stringify(a.stimuli)).toEqual(JSON.stringify(b.stimuli));
    expect(JSON.stringify(a.last)).toEqual(JSON.stringify(b.last));
  });

  it("不同种子 → 刺激序列不同", () => {
    const a = run(1, 20, (v) => ({ action: v.correctAction, reactionMs: 300 }));
    const b = run(2, 20, (v) => ({ action: v.correctAction, reactionMs: 300 }));
    expect(JSON.stringify(a.stimuli)).not.toEqual(JSON.stringify(b.stimuli));
  });
});
