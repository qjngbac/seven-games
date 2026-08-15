/**
 * 规则讲解器 (RulePresenter/Explainer，文档 §3.5 / §6.3)。
 * 把「命中轨迹」翻译成玩家能看懂的反馈：命中的规则 → 优先级 → 正确动作。
 * 不实现判断逻辑（判断在 evaluator），只负责把结果「讲清楚」。
 */
import type { Action, EvalResult, HitTrace } from "./schema";

export const ACTION_LABEL: Record<Action, string> = {
  LEFT: "左",
  RIGHT: "右",
  SKIP: "跳过",
  INVERT_BASE: "反转规则",
};

/** 单条命中轨迹的中文描述 */
export function traceLine(t: HitTrace, index: number): string {
  const arrow = t.action === "INVERT_BASE" ? "→ 反转" : `→ 按${ACTION_LABEL[t.action]}`;
  return ` ${index + 1}. ${t.text}（优先级 ${t.priority}）${arrow}`;
}

/** 完整轨迹说明，用于复盘/错误反馈 */
export function explainTrace(result: EvalResult): string {
  if (result.trace.length === 0) {
    return `没有任何规则命中 → 默认按${ACTION_LABEL[result.action]}`;
  }
  const lines = result.trace.map((t, i) => traceLine(t, i)).join("\n");
  return `${lines}\n = 正确动作：${ACTION_LABEL[result.action]}`;
}

/**
 * 错误反馈：不只闪红，而是展示「为什么错」。
 * playerAction 为玩家实际按下的动作（超时记为 SKIP 或 null）。
 */
export function explainMistake(playerAction: Action | null, result: EvalResult): string {
  const got = playerAction ? ACTION_LABEL[playerAction] : "超时";
  const head = `你按了「${got}」，但正确是「${ACTION_LABEL[result.action]}」。\n`;
  return head + explainTrace(result);
}

/** 单条规则的简短教学句（用于规则预览/练习室） */
export function teachRule(rule: { text: string; example?: string; priority: number }): string {
  const base = `${rule.text}（优先级 ${rule.priority}）`;
  return rule.example ? `${base}\n 例：${rule.example}` : base;
}
