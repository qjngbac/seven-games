import type {
  Constraint,
  Puzzle,
  RoleAssignment,
  RoleId,
  Statement,
  StatementId,
} from "./ast";
import { passesConstraints, truthOfAnswer } from "./solver";

function roleLabel(puzzle: Puzzle, role: RoleId): string {
  return puzzle.roleLabels?.[role] ?? role;
}

function charName(puzzle: Puzzle, id: string): string {
  return puzzle.characters.find((c) => c.id === id)?.name ?? id;
}

function stmtBySpeaker(puzzle: Puzzle, speaker: string): Statement | undefined {
  return puzzle.statements.find((s) => s.speaker === speaker);
}

/** 把约束翻译成人话。 */
export function describeConstraint(puzzle: Puzzle, c: Constraint): string {
  switch (c.type) {
    case "exactRoleCount":
      return `恰好有 ${c.count} 个人是${roleLabel(puzzle, c.role)}`;
    case "minRoleCount":
      return `至少有 ${c.count} 个人是${roleLabel(puzzle, c.role)}`;
    case "maxRoleCount":
      return `至多有 ${c.count} 个人是${roleLabel(puzzle, c.role)}`;
    case "exactTrueStatements":
      return `恰好有 ${c.count} 句话为真`;
    case "atLeastTrueStatements":
      return `至少有 ${c.count} 句话为真`;
    case "atMostTrueStatements":
      return `至多有 ${c.count} 句话为真`;
    case "roleStatementTruth":
      return `身份为${roleLabel(puzzle, c.role)}的人${
        c.truth ? "只说真话" : "只说假话"
      }`;
    case "allRolesDistinct":
      return `每个人的身份互不相同`;
    default: {
      const _never: never = c;
      return _never;
    }
  }
}

/** 列出在某真值表下为真的陈述（用于错误反馈）。 */
function trueStatements(
  puzzle: Puzzle,
  truth: Record<StatementId, boolean>,
): Statement[] {
  return puzzle.statements.filter((s) => truth[s.id]);
}

/**
 * 错误分析：给定玩家提交，找到第一个被违反的约束，并生成可读矛盾说明。
 * 若提交自身满足全部约束（却不是唯一解），则给出内容警告。
 */
export function explainViolation(
  puzzle: Puzzle,
  answer: RoleAssignment,
): { ok: boolean; message: string; violated?: Constraint } {
  const truth = truthOfAnswer(puzzle, answer);
  const trueList = trueStatements(puzzle, truth);
  for (const c of puzzle.constraints) {
    if (!passesConstraints(answer, truth, puzzle.statements, [c])) {
      let detail = "";
      if (
        c.type === "exactTrueStatements" ||
        c.type === "atLeastTrueStatements" ||
        c.type === "atMostTrueStatements"
      ) {
        const names = trueList
          .map((s) => `${charName(puzzle, s.speaker)}（"${s.text}"）`)
          .join("、");
        detail =
          trueList.length === 0
            ? "但在你的判断里没有任何一句话为真。"
            : `但在你的判断里为真的有 ${trueList.length} 句：${names}。`;
      } else if (c.type === "roleStatementTruth") {
        const violators = puzzle.statements
          .filter(
            (s) => answer[s.speaker] === c.role && truth[s.id] !== c.truth,
          )
          .map((s) => `${charName(puzzle, s.speaker)}（"${s.text}"）`);
        detail =
          violators.length > 0
            ? `而你说${roleLabel(puzzle, c.role)}的是：${violators.join(
                "、",
              )}——这与规则矛盾。`
            : "";
      } else if (
        c.type === "exactRoleCount" ||
        c.type === "minRoleCount" ||
        c.type === "maxRoleCount"
      ) {
        let n = 0;
        for (const ch in answer) if (answer[ch] === c.role) n++;
        detail = `但在你的判断里是${roleLabel(puzzle, c.role)}的有 ${n} 人。`;
      }
      return {
        ok: false,
        violated: c,
        message: `违反规则「${describeConstraint(puzzle, c)}」。${
          detail
        }请调整你的判断。`,
      };
    }
  }
  // 提交满足所有约束 → 这是一个合法解。唯一解谜题下即正解；
  // 多解谜题（不应发布）下视为内容缺陷。
  return {
    ok: true,
    message: "你的判断满足全部规则。",
  };
}

/**
 * 生成三级提示。优先使用作者提供的 hints；
 * 否则从唯一解合成（对所有合法解——此处即唯一解——必然成立）。
 */
export function generateHints(
  puzzle: Puzzle,
  solution: RoleAssignment,
): [string, string, string] {
  if (puzzle.hints) return puzzle.hints;
  // 合成提示
  const impostorRole = puzzle.roles.find(
    (r) => (puzzle.roleLabels?.[r] ?? r).includes("伪装") || r === "impostor",
  );
  const impostorChar = impostorRole
    ? puzzle.characters.find((c) => solution[c.id] === impostorRole)
    : undefined;
  const focus = impostorChar
    ? stmtBySpeaker(puzzle, impostorChar.id)
    : puzzle.statements[0];
  const focusName = focus ? charName(puzzle, focus.speaker) : "某人";
  const l1 = `关注 ${focusName} 说的话——它和全局约束直接相关，是破局钥匙。`;
  const l2 = `试着假设每个人「说真话 / 说假话」两种可能，结合「${
    puzzle.constraints.map((c) => describeConstraint(puzzle, c)).join("；")
  }」，会有一组假设立刻自相矛盾，排除它即可。`;
  const l3 = impostorChar
    ? `关键结论：根据唯一解，${charName(
        puzzle,
        impostorChar.id,
      )} 的真实身份是 ${roleLabel(puzzle, solution[impostorChar.id])}。`
    : `关键结论：唯一解中身份分配为 ${puzzle.characters
        .map((c) => `${c.name}=${roleLabel(puzzle, solution[c.id])}`)
        .join("，")}。`;
  return [l1, l2, l3];
}

/**
 * 构建结算推理链（最短可读推导）。优先用作者提供的 reasoningChain；
 * 否则从唯一解合成：列出每条陈述在解中的真假与依据，再说明满足约束。
 */
export function buildReasoningChain(
  puzzle: Puzzle,
  solution: RoleAssignment,
): string[] {
  if (puzzle.reasoningChain && puzzle.reasoningChain.length > 0) {
    return puzzle.reasoningChain;
  }
  const truth = truthOfAnswer(puzzle, solution);
  const steps: string[] = [];
  for (const s of puzzle.statements) {
    steps.push(
      `${charName(puzzle, s.speaker)}说：「${s.text}」→ 在唯一解中为${
        truth[s.id] ? "真" : "假"
      }（由身份分配推出）。`,
    );
  }
  steps.push(`满足全部约束：${puzzle.constraints
    .map((c) => describeConstraint(puzzle, c))
    .join("；")}。`);
  steps.push(
    `因此唯一身份分配：${puzzle.characters
      .map((c) => `${c.name} = ${roleLabel(puzzle, solution[c.id])}`)
      .join("，")}。`,
  );
  return steps;
}
