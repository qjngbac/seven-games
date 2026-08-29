/**
 * 游戏会话 / 核心回合循环 (文档 §2.1 / §4)。
 *
 * 这是一个「纯逻辑」的会话对象，不依赖 Phaser / DOM：
 *  - 场景只负责渲染并把「玩家输入 + 反应毫秒」喂给 submit；
 *  - 所有规则求值、计分、连击、动态揭示都由这里完成；
 *  - 因生成用固定种子且覆盖度选择只依赖内部状态，同一 seed 必然产生同一序列（可重放，文档 §5.2 / §8.4）。
 */
import type { Action, EvalResult, HitTrace, Rule, RuleSet, Stimulus } from "./rules/schema";
import { Rng } from "./rng";
import { evaluate } from "./rules/evaluator";
import { generateStimulus } from "./stimuli/generator";
import type { ModeConfig, ModeId } from "./modes/types";
import { MODES } from "./modes/types";
import { applyDelta, DEFAULT_SCORE, scoreForRound, type ScoreConfig } from "./scoring/score";
import { RunRecorder, type RoundRecord } from "./recorder";

export interface SessionConfig {
  mode: ModeId | ModeConfig;
  ruleset: RuleSet;
  seed: number;
  score?: ScoreConfig;
  recorder?: RunRecorder;
}

export interface RoundView {
  index: number; // 1-based
  stimulus: Stimulus;
  correctAction: Action;
  deadlineMs: number;
  activeRules: Rule[];
  /** 上一轮刚揭示、尚未向玩家展示过的规则（供 RULE_CHANGE 场景用） */
  pendingReveal: Rule[];
}

export interface SubmitResult {
  correct: boolean;
  timeout: boolean;
  playerAction: Action | null;
  correctAction: Action;
  gained: number;
  combo: number;
  score: number;
  lives: number;
  trace: HitTrace[];
  /** 本轮结束后揭示的新规则（若有） */
  revealed: Rule[];
  over: boolean;
  result: RunResult | null;
}

export interface RunResult {
  mode: ModeId;
  accuracy: number;
  rounds: number;
  correct: number;
  score: number;
  maxCombo: number;
  reaction: { min: number; avg: number; max: number; count: number };
  mistakesByRule: Record<string, number>;
  finished: boolean;
  reason: "lives" | "complete" | "manual";
  seed: number;
}

export class GameSession {
  readonly mode: ModeConfig;
  readonly ruleset: RuleSet;
  private rng: Rng;
  private initialSeed: number;
  private scoreCfg: ScoreConfig;
  private recorder?: RunRecorder;

  private fullRules: Rule[];
  activeRules: Rule[];
  private revealQueue: Rule[];
  private pendingReveal: Rule[] = [];

  private round = 0;
  private lives: number;
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private correctCount = 0;
  private reactionTimes: number[] = [];
  private mistakesByRule: Record<string, number> = {};
  private featured: Record<string, number> = {};
  private finished = false;
  private finishReason: RunResult["reason"] = "complete";

  constructor(cfg: SessionConfig) {
    this.mode = typeof cfg.mode === "string" ? MODES[cfg.mode] : cfg.mode;
    this.ruleset = cfg.ruleset;
    this.rng = new Rng(cfg.seed);
    this.initialSeed = cfg.seed;
    this.scoreCfg = cfg.score ?? DEFAULT_SCORE;
    this.recorder = cfg.recorder;
    this.fullRules = cfg.ruleset.rules;

    if (this.mode.enableDynamicRules) {
      const n = Math.min(cfg.ruleset.initialActive, this.fullRules.length);
      this.activeRules = this.fullRules.slice(0, n);
      this.revealQueue = this.fullRules.slice(n);
    } else {
      // 练习/非动态：规则全开
      this.activeRules = this.fullRules.slice();
      this.revealQueue = [];
    }
    this.lives = this.mode.lives;
  }

  getActiveRules(): Rule[] {
    return this.activeRules;
  }

  getRound(): number {
    return this.round;
  }

  getLives(): number {
    return this.lives;
  }

  getScore(): number {
    return this.score;
  }

  getCombo(): number {
    return this.combo;
  }

  isOver(): boolean {
    return this.finished;
  }

  /** 选一条「覆盖度最低」的活跃规则作为本轮目标，保证多样性与可重放 */
  private pickTarget(): string | undefined {
    let best: Rule | null = null;
    let bestCount = Infinity;
    for (const r of this.activeRules) {
      const c = this.featured[r.id] ?? 0;
      if (c < bestCount) {
        bestCount = c;
        best = r;
      }
    }
    return best?.id;
  }

  /** 开始下一轮，返回本轮视图 */
  beginRound(): RoundView {
    const targetId = this.pickTarget();
    const stimulus = generateStimulus(this.rng, this.activeRules, { targetRuleId: targetId });
    const ev: EvalResult = evaluate(stimulus, this.activeRules);
    if (targetId) this.featured[targetId] = (this.featured[targetId] ?? 0) + 1;
    this.round += 1;
    this.lastStimulus = stimulus;
    this.lastEval = ev;
    return {
      index: this.round,
      stimulus,
      correctAction: ev.action,
      deadlineMs: this.mode.timeLimitMs,
      activeRules: this.activeRules.slice(),
      pendingReveal: this.pendingReveal.slice(),
    };
  }

  /** 提交一次输入 */
  submit(playerAction: Action | null, reactionMs: number): SubmitResult {
    const round = this.round;
    const stimulus = this.lastStimulus!;
    const ev = this.lastEval!;
    const timeout = playerAction === null;
    const correct = !timeout && playerAction === ev.action;

    if (!timeout) this.reactionTimes.push(reactionMs);

    const sc = scoreForRound(correct, reactionMs, this.combo, this.scoreCfg);
    this.score = applyDelta(this.score, sc.delta);
    this.combo = sc.comboAfter;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    if (correct) this.correctCount += 1;
    else if (this.mode.countMistakes) {
      const decisive = ev.trace.length > 0 ? ev.trace[ev.trace.length - 1].ruleId : "default";
      this.mistakesByRule[decisive] = (this.mistakesByRule[decisive] ?? 0) + 1;
    }

    if (!correct && this.mode.lives > 0) this.lives -= 1;

    const rec: RoundRecord = {
      index: round,
      stimulus,
      correctAction: ev.action,
      playerAction,
      reactionMs,
      correct,
      timeout,
    };
    this.recorder?.record(rec);

    // 动态揭示新规则（在阶段节点、且仍有剩余）
    let revealed: Rule[] = [];
    if (this.mode.enableDynamicRules && this.revealQueue.length > 0 && this.round % this.ruleset.revealEvery === 0) {
      const next = this.revealQueue.shift()!;
      this.activeRules = [...this.activeRules, next];
      revealed = [next];
      this.pendingReveal = revealed;
    } else {
      this.pendingReveal = [];
    }

    // 结算判定
    let over = false;
    if (this.mode.lives > 0 && this.lives <= 0) {
      over = true;
      this.finished = true;
      this.finishReason = "lives";
    } else if (this.round >= this.mode.targetRounds) {
      over = true;
      this.finished = true;
      this.finishReason = "complete";
    }

    return {
      correct,
      timeout,
      playerAction,
      correctAction: ev.action,
      gained: sc.delta,
      combo: this.combo,
      score: this.score,
      lives: this.lives,
      trace: ev.trace,
      revealed,
      over,
      result: over ? this.buildResult() : null,
    };
  }

  /** 手动结束（禅/练习模式由玩家退出） */
  quit(): RunResult {
    this.finished = true;
    this.finishReason = "manual";
    return this.buildResult();
  }

  /** 当前轮刺激与求值结果（beginRound 时缓存，submit 时引用） */
  private lastStimulus: Stimulus | null = null;
  private lastEval: EvalResult | null = null;

  buildResult(): RunResult {
    const count = this.reactionTimes.length;
    const min = count ? Math.min(...this.reactionTimes) : 0;
    const max = count ? Math.max(...this.reactionTimes) : 0;
    const avg = count ? Math.round(this.reactionTimes.reduce((a, b) => a + b, 0) / count) : 0;
    return {
      mode: this.mode.id,
      accuracy: this.round > 0 ? this.correctCount / this.round : 0,
      rounds: this.round,
      correct: this.correctCount,
      score: this.score,
      maxCombo: this.maxCombo,
      reaction: { min, avg, max, count },
      mistakesByRule: { ...this.mistakesByRule },
      finished: this.finished,
      reason: this.finishReason,
      seed: this.initialSeed,
    };
  }
}
