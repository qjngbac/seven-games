/**
 * 回合记录器 (RunRecorder，文档 §6.3)。
 * 只记录种子、刺激与输入，不影响游戏结果；用于复盘与重放验证。
 */
import type { Action, Stimulus } from "./rules/schema";

export interface RoundRecord {
  index: number;
  stimulus: Stimulus;
  correctAction: Action;
  playerAction: Action | null;
  reactionMs: number;
  correct: boolean;
  timeout: boolean;
}

export class RunRecorder {
  readonly seed: number;
  records: RoundRecord[] = [];

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  record(r: RoundRecord): void {
    this.records.push(r);
  }

  toJSON() {
    return { seed: this.seed, records: this.records };
  }
}
