// 命题 AST：所有角色陈述都被同时保存为「展示文本」和「结构化命题」。
// 展示文本只是显示层，真正决定真假的只有这里的 AST。
// 求值器在候选世界（角色身份分配）中计算真假，eqTruth/xorTruth 这类引用
// 其它陈述真值的命题通过 fixpoint 迭代收敛（见 evaluator.ts）。

export type RoleId = string;
export type CharacterId = string;
export type StatementId = string;

/** 一个候选世界：每个角色被分配一个身份（角色）。 */
export interface RoleAssignment {
  [characterId: CharacterId]: RoleId;
}

/** 结构化命题。所有命题都应有可读解释器（见 explainer.ts）。 */
export type Expr =
  // 原子命题：某角色的身份
  | { op: "roleIs"; character: CharacterId; role: RoleId }
  // 原子命题：某身份出现次数恰好为 count
  | { op: "roleCount"; role: RoleId; count: number }
  // 原子命题：两个角色身份相同
  | { op: "sameRole"; a: CharacterId; b: CharacterId }
  // 否定
  | { op: "not"; arg: Expr }
  // 合取
  | { op: "and"; args: Expr[] }
  // 析取
  | { op: "or"; args: Expr[] }
  // 两个陈述真假相同（引用其它陈述的真值）
  | { op: "eqTruth"; left: StatementId; right: StatementId }
  // 两个陈述真假不同（异或真值）
  | { op: "xorTruth"; left: StatementId; right: StatementId }
  // 某陈述本身为真（引用其它陈述的真值）
  | { op: "stmtTruth"; statement: StatementId };

/** 全局约束（作用于整局，而非单条陈述）。 */
export type Constraint =
  | { type: "exactRoleCount"; role: RoleId; count: number }
  | { type: "minRoleCount"; role: RoleId; count: number }
  | { type: "maxRoleCount"; role: RoleId; count: number }
  | { type: "exactTrueStatements"; count: number }
  | { type: "atLeastTrueStatements"; count: number }
  | { type: "atMostTrueStatements"; count: number }
  // 身份决定说话规则：所有由该身份角色说出的陈述，其真假必须等于 truth
  | { type: "roleStatementTruth"; role: RoleId; truth: boolean }
  // 所有角色身份互不相同（身份谜用）
  | { type: "allRolesDistinct" };

/** 单条陈述：说话者 + 展示文本 + 结构化命题。 */
export interface Statement {
  id: StatementId;
  speaker: CharacterId;
  text: string;
  expr: Expr;
}

/** 角色候选身份定义。 */
export interface CharacterDef {
  id: CharacterId;
  name: string;
  avatar?: string;
  /** 该角色可能拥有的身份（默认取谜题全部 roles）。 */
  candidateRoles?: RoleId[];
  /** 搞笑背景/人设一句话。 */
  blurb?: string;
}

/** 一个解 = 角色身份分配 + 各陈述真假。 */
export interface Solution {
  roles: RoleAssignment;
  truth: Record<StatementId, boolean>;
}

/** 求解结果。 */
export interface SolveResult {
  solutions: Solution[];
  status: "unique" | "multiple" | "none" | "illformed";
  /** 是否存在无法收敛的自指世界（内容设计错误信号）。 */
  illformed: boolean;
}

/** 谜题定义（数据驱动，纯 JSON 可描述）。 */
export interface Puzzle {
  id: string;
  title: string;
  /** 简短场景设定（搞笑背景）。 */
  scene: string;
  /** 全部可能身份。 */
  roles: RoleId[];
  /** 身份的中文显示名（用于界面与解释）。 */
  roleLabels?: Record<RoleId, string>;
  /** 本关引入的新机制提示（教学）。 */
  mechanic?: string;
  constraints: Constraint[];
  characters: CharacterDef[];
  statements: Statement[];
  /** 解策略：默认恰好 1 解。 */
  solutionPolicy?: { type: "unique" } | { type: "atLeast"; count: number };
  /** 作者提供的三级提示（可选，缺省由解释器从唯一解合成）。 */
  hints?: [string, string, string];
  /** 最坏情况下的作者推理链（用于结算展示兜底）。 */
  reasoningChain?: string[];
}

/** 玩家提交：对每个角色的身份判断。 */
export type PlayerAnswer = RoleAssignment;
