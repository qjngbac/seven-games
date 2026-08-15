import type {
  CharacterId,
  Expr,
  Puzzle,
  StatementId,
} from "../logic/ast";
import { solve } from "../logic/solver";

export interface ValidationIssue {
  puzzleId: string;
  level: "error" | "warn";
  message: string;
}

/** 收集一个命题引用到的其它陈述 id（仅 eqTruth/xorTruth）。 */
function referencedStatements(expr: Expr, out: Set<StatementId>): void {
  switch (expr.op) {
    case "not":
      referencedStatements(expr.arg, out);
      break;
    case "and":
    case "or":
      for (const a of expr.args) referencedStatements(a, out);
      break;
    case "eqTruth":
    case "xorTruth":
      out.add(expr.left);
      out.add(expr.right);
      break;
    default:
      break;
  }
}

/** 在角色身份引用里是否出现某角色 id / 角色 id 拼写错误。 */
function validateExprTargets(
  expr: Expr,
  puzzle: Puzzle,
  issues: ValidationIssue[],
  path: string,
): void {
  switch (expr.op) {
    case "roleIs": {
      if (!puzzle.characters.some((c) => c.id === expr.character)) {
        issues.push({
          puzzleId: puzzle.id,
          level: "error",
          message: `${path}: roleIs 引用了不存在的角色 "${expr.character}"`,
        });
      }
      if (!puzzle.roles.includes(expr.role)) {
        issues.push({
          puzzleId: puzzle.id,
          level: "error",
          message: `${path}: roleIs 引用了未知身份 "${expr.role}"`,
        });
      }
      break;
    }
    case "sameRole": {
      if (!puzzle.characters.some((c) => c.id === expr.a)) {
        issues.push({
          puzzleId: puzzle.id,
          level: "error",
          message: `${path}: sameRole 引用了不存在的角色 "${expr.a}"`,
        });
      }
      if (!puzzle.characters.some((c) => c.id === expr.b)) {
        issues.push({
          puzzleId: puzzle.id,
          level: "error",
          message: `${path}: sameRole 引用了不存在的角色 "${expr.b}"`,
        });
      }
      break;
    }
    case "roleCount": {
      if (!puzzle.roles.includes(expr.role)) {
        issues.push({
          puzzleId: puzzle.id,
          level: "error",
          message: `${path}: roleCount 引用了未知身份 "${expr.role}"`,
        });
      }
      break;
    }
    case "not":
      validateExprTargets(expr.arg, puzzle, issues, path);
      break;
    case "and":
    case "or":
      expr.args.forEach((a, i) =>
        validateExprTargets(a, puzzle, issues, `${path}.args[${i}]`),
      );
      break;
    case "eqTruth":
    case "xorTruth": {
      for (const id of [expr.left, expr.right]) {
        if (!puzzle.statements.some((s) => s.id === id)) {
          issues.push({
            puzzleId: puzzle.id,
            level: "error",
            message: `${path}: 引用了不存在的陈述 "${id}"`,
          });
        }
      }
      break;
    }
    case "stmtTruth": {
      if (!puzzle.statements.some((s) => s.id === expr.statement)) {
        issues.push({
          puzzleId: puzzle.id,
          level: "error",
          message: `${path}: 引用了不存在的陈述 "${expr.statement}"`,
        });
      }
      break;
    }
    default: {
      const _never: never = expr;
      void _never;
    }
  }
}

/**
 * 深度校验单个谜题：
 * 1) 结构引用（角色/身份/陈述存在）
 * 2) 自指或循环无法收敛（由求解器 illformed 标志捕捉）
 * 3) 解数量符合 solutionPolicy（正式关卡必须唯一解）
 */
export function validatePuzzle(puzzle: Puzzle): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const charIds = new Set<CharacterId>(puzzle.characters.map((c) => c.id));
  if (puzzle.characters.length !== charIds.size) {
    issues.push({
      puzzleId: puzzle.id,
      level: "error",
      message: "角色 id 重复",
    });
  }
  const stmtIds = new Set<StatementId>(puzzle.statements.map((s) => s.id));
  if (puzzle.statements.length !== stmtIds.size) {
    issues.push({
      puzzleId: puzzle.id,
      level: "error",
      message: "陈述 id 重复",
    });
  }
  // 角色候选身份必须在全局 roles 内
  for (const c of puzzle.characters) {
    for (const r of c.candidateRoles ?? []) {
      if (!puzzle.roles.includes(r)) {
        issues.push({
          puzzleId: puzzle.id,
          level: "error",
          message: `角色 ${c.id} 的候选身份 "${r}" 不在全局 roles 中`,
        });
      }
    }
  }
  // 陈述说话者必须是角色
  for (const s of puzzle.statements) {
    if (!charIds.has(s.speaker)) {
      issues.push({
        puzzleId: puzzle.id,
        level: "error",
        message: `陈述 ${s.id} 的说话者 "${s.speaker}" 不是已定义角色`,
      });
    }
    validateExprTargets(s.expr, puzzle, issues, `statement ${s.id}`);
    // 自指：陈述直接引用自身真值
    const refs = new Set<StatementId>();
    referencedStatements(s.expr, refs);
    if (refs.has(s.id)) {
      issues.push({
        puzzleId: puzzle.id,
        level: "error",
        message: `陈述 ${s.id} 自指自身真值（循环无法收敛）`,
      });
    }
  }
  // 约束引用
  for (const c of puzzle.constraints) {
    if ("role" in c && c.role && !puzzle.roles.includes(c.role)) {
      issues.push({
        puzzleId: puzzle.id,
        level: "error",
        message: `约束 ${(c as { type: string }).type} 引用了未知身份 "${
          (c as { role: string }).role
        }"`,
      });
    }
  }

  if (issues.some((i) => i.level === "error")) return issues;

  // 运行求解器：检查收敛性与解数量
  const result = solve(puzzle);
  if (result.illformed) {
    issues.push({
      puzzleId: puzzle.id,
      level: "error",
      message: "存在无法收敛的自指/循环陈述（内容设计错误）",
    });
    return issues;
  }
  const want =
    puzzle.solutionPolicy?.type === "atLeast"
      ? puzzle.solutionPolicy.count
      : 1;
  if (want === 1 && result.status !== "unique") {
    issues.push({
      puzzleId: puzzle.id,
      level: "error",
      message: `解数量不符合「唯一解」要求：实际为 ${result.solutions.length} 个（${result.status}）`,
    });
  } else if (
    puzzle.solutionPolicy?.type === "atLeast" &&
    result.solutions.length < want
  ) {
    issues.push({
      puzzleId: puzzle.id,
      level: "error",
      message: `解数量少于要求：实际 ${result.solutions.length}，要求 ≥ ${want}`,
    });
  }
  return issues;
}
