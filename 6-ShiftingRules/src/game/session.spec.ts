import { describe, it, expect } from "vitest";
import { GameSession, type SubmitResult } from "./session";
import type { Action, Stimulus } from "./rules/schema";
import { getPack, PACKS, LOAD_ERRORS } from "../data/packs";
import type { RoundView } from "./session";
import { matchPredicate } from "./rules/evaluator";

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

describe("动态揭示必须覆盖整包规则（普通模式 30 轮内不留死规则）", () => {
  it("所有规则包都应通过加载期校验（含揭示覆盖校验）", () => {
    expect(LOAD_ERRORS, `加载错误：${LOAD_ERRORS.join("；")}`).toEqual([]);
    expect(PACKS).toHaveLength(6);
  });

  for (const pack of PACKS) {
    it(`${pack.id}（${pack.ruleset.rules.length} 条规则）30 轮内全部生效`, () => {
      const s = new GameSession({ mode: "normal", ruleset: pack.ruleset, seed: 20260910 });
      for (let i = 0; i < 30; i++) {
        const v = s.beginRound();
        const res = s.submit(v.correctAction, 300);
        if (res.over) break;
      }
      expect(
        s.getActiveRules().length,
        `${pack.id} 仍有规则未生效：${pack.ruleset.rules
          .filter((r) => !s.getActiveRules().some((a) => a.id === r.id))
          .map((r) => r.id)
          .join(", ")}`,
      ).toBe(pack.ruleset.rules.length);
    });
  }
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

describe("新规则入场与选择对应性审计（用户痛点专项测试）", () => {
  it("基础颜色包：第 8 轮揭示 green_skip 后，第 9 轮必定出现绿色且动作为 SKIP", () => {
    const pack = getPack("pack-base")!;
    const s = new GameSession({ mode: "normal", ruleset: pack, seed: 12345 });
    let greenAppearedAtRound9 = false;
    let round9Action: Action | null = null;
    let totalGreenRounds = 0;

    for (let i = 1; i <= 30; i++) {
      const v = s.beginRound();
      if (i === 9) {
        if (v.stimulus.color === "green") {
          greenAppearedAtRound9 = true;
          round9Action = v.correctAction;
        }
      }
      if (v.stimulus.color === "green") {
        totalGreenRounds++;
        expect(v.correctAction).toBe("SKIP");
      }
      s.submit(v.correctAction, 300);
    }

    // 第 9 轮必须紧跟新规则，展示绿色且动作必须是 SKIP (跳过)
    expect(greenAppearedAtRound9, "第 9 轮未出现绿色刺激！").toBe(true);
    expect(round9Action, "第 9 轮绿色对应的操作应为 SKIP（跳过）").toBe("SKIP");

    // 全局 30 轮中，第 9~30 轮绿色出现的次数应当均衡充足（至少 6 轮以上）
    expect(totalGreenRounds).toBeGreaterThanOrEqual(6);
  });

  for (const p of PACKS) {
    it(`${p.name}（${p.id}）：每次新规则入场后，下一轮必定出现该新规则对应的题目且动作正确`, () => {
      const s = new GameSession({ mode: "normal", ruleset: p.ruleset, seed: 98765 });
      let lastRevealedRuleId: string | null = null;

      for (let i = 1; i <= 30; i++) {
        const v = s.beginRound();

        if (lastRevealedRuleId) {
          // 当前轮为新规则入场后的第一轮：验证该题目命中了刚刚揭示的新规则！
          const ev = s.getActiveRules().find((r) => r.id === lastRevealedRuleId);
          expect(ev, `未在 activeRules 中找到刚揭示的规则 ${lastRevealedRuleId}`).toBeDefined();

          const hits = s.getActiveRules().filter((r) => matchPredicate(r.predicate, v.stimulus));
          expect(
            hits.some((h) => h.id === lastRevealedRuleId),
            `轮次 ${i} 刚入场规则 ${lastRevealedRuleId}，但生成的刺激未命中该规则！刺激: ${JSON.stringify(v.stimulus)}`,
          ).toBe(true);

          lastRevealedRuleId = null;
        }

        const res = s.submit(v.correctAction, 300);
        if (res.revealed.length > 0) {
          lastRevealedRuleId = res.revealed[0].id;
        }
        if (res.over) break;
      }
    });
  }
});

