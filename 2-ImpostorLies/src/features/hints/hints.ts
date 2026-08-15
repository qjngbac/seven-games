import type { Puzzle, RoleAssignment } from "../../logic/ast";
import { solve } from "../../logic/solver";
import { generateHints } from "../../logic/explainer";

export interface HintState {
  level: 0 | 1 | 2 | 3; // 已解锁到第几层
  texts: [string, string, string] | null;
}

/** 计算谜题的唯一解角色分配（用于提示与结算）。 */
export function uniqueSolution(puzzle: Puzzle): RoleAssignment | null {
  const res = solve(puzzle);
  return res.status === "unique" ? res.solutions[0].roles : null;
}

/**
 * 三级提示：由唯一解推导，因此对所有合法解（此处即唯一解）必然成立。
 * 第一层：关注哪句话；第二层：指出矛盾组合；第三层：关键结论。
 * 提示只给方向，不直接替玩家完成推理，且扣分但不阻断通关。
 */
export function getHints(puzzle: Puzzle): [string, string, string] {
  const sol = uniqueSolution(puzzle);
  if (!sol) {
    return [
      "本关求解器未找到唯一解，请检查关卡内容。",
      "本关求解器未找到唯一解，请检查关卡内容。",
      "本关求解器未找到唯一解，请检查关卡内容。",
    ];
  }
  return generateHints(puzzle, sol);
}
