import type {
  Expr,
  RoleAssignment,
  RoleId,
  Statement,
  StatementId,
} from "./ast";

// 真值可能为「未定」：在 fixpoint 迭代过程中，eqTruth/xorTruth 引用的陈述
// 真假可能尚未算出。此时返回 undefined，由迭代器稍后重试。
export type Tri = boolean | undefined;

function countRole(roles: RoleAssignment, role: RoleId): number {
  let n = 0;
  for (const c in roles) if (roles[c] === role) n++;
  return n;
}

/**
 * 在给定世界（角色身份分配）与当前真值表下，计算一个命题的真假。
 * 若命题依赖尚未确定的陈述真值，返回 undefined。
 */
export function evaluate(
  expr: Expr,
  roles: RoleAssignment,
  truth: Record<StatementId, boolean>,
): Tri {
  switch (expr.op) {
    case "roleIs":
      return roles[expr.character] === expr.role;
    case "roleCount":
      return countRole(roles, expr.role) === expr.count;
    case "sameRole":
      return roles[expr.a] === roles[expr.b];
    case "not": {
      const v = evaluate(expr.arg, roles, truth);
      return v === undefined ? undefined : !v;
    }
    case "and": {
      let all = true;
      for (const a of expr.args) {
        const v = evaluate(a, roles, truth);
        if (v === undefined) return undefined;
        if (!v) all = false;
      }
      return all;
    }
    case "or": {
      let any = false;
      for (const a of expr.args) {
        const v = evaluate(a, roles, truth);
        if (v === undefined) return undefined;
        if (v) any = true;
      }
      return any;
    }
    case "eqTruth": {
      const l = truth[expr.left];
      const r = truth[expr.right];
      if (l === undefined || r === undefined) return undefined;
      return l === r;
    }
    case "xorTruth": {
      const l = truth[expr.left];
      const r = truth[expr.right];
      if (l === undefined || r === undefined) return undefined;
      return l !== r;
    }
    case "stmtTruth": {
      const v = truth[expr.statement];
      if (v === undefined) return undefined;
      return v;
    }
    default: {
      // 穷尽性检查：新增 op 时这里会编译报错。
      const _never: never = expr;
      return _never;
    }
  }
}

/**
 * 给定一个世界（角色身份分配），通过反复迭代求出所有陈述的真值。
 * - 纯角色命题立即确定。
 * - eqTruth/xorTruth 依赖其它陈述，待其确定后确定。
 * - 若迭代 N 轮后仍有 undefined，说明存在无法收敛的自指循环 → illformed。
 * 返回值：{ truth, illformed }。
 */
export function computeTruth(
  roles: RoleAssignment,
  statements: Statement[],
  maxIter = 64,
): { truth: Record<StatementId, boolean>; illformed: boolean } {
  const truth: Record<StatementId, boolean> = {};
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    for (const s of statements) {
      if (truth[s.id] !== undefined) continue;
      const v = evaluate(s.expr, roles, truth);
      if (v !== undefined) {
        truth[s.id] = v;
        changed = true;
      }
    }
    if (!changed) break;
  }
  // 仍有可能依赖未定的 → 自指/循环，无法收敛
  const illformed =
    statements.length > 0 && statements.some((s) => truth[s.id] === undefined);
  if (illformed) {
    // 仍做一次稳定性校验：即便都"算出了"，也可能互相矛盾
    for (const s of statements) {
      const v = evaluate(s.expr, roles, truth);
      if (v !== undefined && v !== truth[s.id]) {
        return { truth: {}, illformed: true };
      }
    }
  }
  return { truth, illformed };
}
