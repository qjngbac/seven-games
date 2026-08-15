import type {
  CharacterDef,
  Constraint,
  Puzzle,
  RoleAssignment,
  RoleId,
  SolveResult,
  Solution,
  StatementId,
} from "./ast";
import { computeTruth, evaluate } from "./evaluator";

/** 候选身份：角色显式声明则用声明的，否则用谜题全部 roles。 */
export function candidateRolesOf(
  ch: CharacterDef,
  allRoles: RoleId[],
): RoleId[] {
  return ch.candidateRoles && ch.candidateRoles.length > 0
    ? ch.candidateRoles
    : allRoles;
}

/** 枚举所有角色身份分配（候选身份的笛卡尔积）。 */
function* enumerateWorlds(puzzle: Puzzle): Generator<RoleAssignment> {
  const chars = puzzle.characters;
  const choices = chars.map((c) => candidateRolesOf(c, puzzle.roles));
  // 迭代计数法生成笛卡尔积
  const idx = new Array(chars.length).fill(0);
  if (chars.length === 0) return;
  while (true) {
    const world: RoleAssignment = {};
    for (let i = 0; i < chars.length; i++) world[chars[i].id] = choices[i][idx[i]];
    yield world;
    // 进位
    let p = chars.length - 1;
    while (p >= 0) {
      idx[p]++;
      if (idx[p] < choices[p].length) break;
      idx[p] = 0;
      p--;
    }
    if (p < 0) break;
  }
}

/** 判断某个（角色分配 + 真值表）是否满足全部约束。 */
export function passesConstraints(
  roles: RoleAssignment,
  truth: Record<StatementId, boolean>,
  statements: Puzzle["statements"],
  constraints: Constraint[],
): boolean {
  const trueCount = statements.filter((s) => truth[s.id]).length;
  for (const c of constraints) {
    switch (c.type) {
      case "exactRoleCount": {
        let n = 0;
        for (const ch in roles) if (roles[ch] === c.role) n++;
        if (n !== c.count) return false;
        break;
      }
      case "minRoleCount": {
        let n = 0;
        for (const ch in roles) if (roles[ch] === c.role) n++;
        if (n < c.count) return false;
        break;
      }
      case "maxRoleCount": {
        let n = 0;
        for (const ch in roles) if (roles[ch] === c.role) n++;
        if (n > c.count) return false;
        break;
      }
      case "exactTrueStatements": {
        if (trueCount !== c.count) return false;
        break;
      }
      case "atLeastTrueStatements": {
        if (trueCount < c.count) return false;
        break;
      }
      case "atMostTrueStatements": {
        if (trueCount > c.count) return false;
        break;
      }
      case "roleStatementTruth": {
        for (const s of statements) {
          if (roles[s.speaker] === c.role) {
            if (truth[s.id] !== c.truth) return false;
          }
        }
        break;
      }
      case "allRolesDistinct": {
        const seen = new Set<RoleId>();
        for (const ch in roles) {
          if (seen.has(roles[ch])) return false;
          seen.add(roles[ch]);
        }
        break;
      }
      default: {
        const _never: never = c;
        return _never;
      }
    }
  }
  return true;
}

/** 求解：枚举世界 → fixpoint 求真值 → 约束过滤 → 收集解。 */
export function solve(puzzle: Puzzle): SolveResult {
  const solutions: Solution[] = [];
  let illformed = false;
  for (const world of enumerateWorlds(puzzle)) {
    const { truth, illformed: bad } = computeTruth(world, puzzle.statements);
    if (bad) {
      illformed = true;
      continue;
    }
    if (passesConstraints(world, truth, puzzle.statements, puzzle.constraints)) {
      solutions.push({ roles: { ...world }, truth: { ...truth } });
    }
  }
  let status: SolveResult["status"];
  if (solutions.length === 1) status = "unique";
  else if (solutions.length === 0) status = "none";
  else status = "multiple";
  return { solutions, status, illformed };
}

/** 判断玩家提交是否命中某个合法解（用于判定过关）。 */
export function answerMatchesSolution(
  puzzle: Puzzle,
  answer: RoleAssignment,
): boolean {
  const res = solve(puzzle);
  return res.solutions.some(
    (sol) =>
      puzzle.characters.every((ch) => sol.roles[ch.id] === answer[ch.id]),
  );
}

/** 给定玩家提交，计算其真值表（用于错误分析）。 */
export function truthOfAnswer(
  puzzle: Puzzle,
  answer: RoleAssignment,
): Record<StatementId, boolean> {
  return computeTruth(answer, puzzle.statements).truth;
}

// 重新导出，便于解释器使用
export { evaluate };
