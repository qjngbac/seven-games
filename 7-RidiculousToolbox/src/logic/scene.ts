import type { GameState, ScenePredicate } from './schema';

/** 递归评估场景状态谓词（文档 §5：验收基于最终状态，不绑定操作序列） */
export function evalPredicate(pred: ScenePredicate, state: GameState): boolean {
  if ('and' in pred) return pred.and.every((p) => evalPredicate(p, state));
  if ('or' in pred) return pred.or.some((p) => evalPredicate(p, state));
  if ('not' in pred) return !evalPredicate(pred.not, state);
  if ('target' in pred) {
    const s = state.scene[pred.target] ?? {};
    return Object.entries(pred.state).every(([k, v]) => s[k] === v);
  }
  if ('flag' in pred) return state.flags[pred.flag] === pred.equals;
  return false;
}
