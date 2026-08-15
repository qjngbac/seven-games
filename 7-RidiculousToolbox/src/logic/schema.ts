// 《离谱工具箱》核心数据模型
// 设计要点（见开发文档 §3 / §5）：
// - 物品类型(ItemDefinition)与实例(ItemInstance)分离；实例状态不写回共享定义。
// - 配方、场景热点、关卡、反馈全部数据驱动；程序只负责解释规则，不在代码中写大量 if-else。
// - 关卡完成由「最终场景状态谓词」判断，不绑定唯一操作序列。

export type Tag = string;
export type Verb = 'combine' | 'use' | 'apply' | 'insert' | 'place' | 'pour' | 'connect' | 'feed';

/** 物品类型定义（共享、不可变） */
export interface ItemDefinition {
  id: string;
  name: string;
  icon: string;
  tags: Tag[];
  /** 给玩家的描述，提示用途但不直接给答案 */
  description: string;
  /** 该物品可被用于哪些动作（UI 提示用） */
  actions?: Verb[];
}

/** 背包中的物品实例（可变状态） */
export interface ItemInstance {
  instanceId: string;
  defId: string;
  /** 实例状态，如 { cut: true, powered: true }，绝不写回 ItemDefinition */
  state: Record<string, unknown>;
  quantity: number;
  /** 可选显示名覆盖（如「已接线的风扇」） */
  name?: string;
}

/** 配方输入匹配规格：按 tag 或按精确 defId 匹配 */
export interface InputSpec {
  tag?: Tag;
  item?: string; // defId
  count?: number; // 需要的数量（默认 1）
  /** 该输入是否被消耗（工具类设为 false） */
  consumed?: boolean;
  /** 匹配时额外要求的实例状态，如 { powered: true } */
  requireState?: Record<string, unknown>;
}

/** 配方条件：基于场景状态/全局 flag/背包内容 */
export interface RecipeCondition {
  flag?: { key: string; equals: unknown };
  targetState?: { targetId: string; state: Record<string, unknown> };
  hasItem?: { defId?: string; tag?: Tag };
}

/** 配方输出 */
export interface OutputSpec {
  addItem?: { defId: string; count?: number; state?: Record<string, unknown>; name?: string };
  /** 是否消耗输入实例（combine 默认 true；use 默认消耗被用物品） */
  consumeInputs?: boolean;
  setScene?: { targetId: string; state: Record<string, unknown> };
  setFlag?: { key: string; value: unknown };
  feedback?: string;
}

/** 评分维度（按操作累积） */
export interface Scores {
  professional?: number;
  safety?: number;
  comedy?: number;
  cost?: number; // 成本：越高越费资源
}

export type RecipeKind = 'combine' | 'use';

/** 组合/使用配方 */
export interface Recipe {
  recipeId: string;
  kind: RecipeKind;
  inputs: InputSpec[];
  /** use 类配方：目标热点 id 或 tag */
  target?: { id?: string; tag?: Tag };
  /** use 类配方：要求的动作谓词（可选） */
  verb?: Verb;
  order?: 'unordered' | 'ordered';
  conditions?: RecipeCondition[];
  /** 输出（可空：纯反馈配方可省略，表示只产生文字反馈、不改状态） */
  outputs?: OutputSpec[];
  scores?: Scores;
  feedback: string;
  /** 越大越优先；同输入同优先级多条 → 加载报错 */
  priority?: number;
  /** 'solution' 推进关卡，'failure' 搞笑失败，'neutral' 中性 */
  category?: 'solution' | 'failure' | 'neutral';
  /** 若属于离谱图鉴的独特失败，给出图鉴评语 */
  galleryNote?: string;
}

/** 场景热点定义 */
export interface SceneTargetDef {
  id: string;
  name: string;
  icon: string;
  tags: Tag[];
  description: string;
  initial: Record<string, unknown>;
  /** 可接受的动词（UI 提示用，可选） */
  acceptedActions?: Verb[];
}

/** 场景状态谓词（可序列化，递归） */
export type ScenePredicate =
  | { target: string; state: Record<string, unknown> }
  | { flag: string; equals: unknown }
  | { and: ScenePredicate[] }
  | { or: ScenePredicate[] }
  | { not: ScenePredicate };

export type SolutionTier = 'professional' | 'temporary' | 'absurd';

/** 关卡解法（基于最终状态，多解并存） */
export interface Solution {
  id: string;
  tier: SolutionTier;
  predicate: ScenePredicate;
  endingText: string;
}

/** 单关定义 */
export interface Level {
  id: string;
  chapter: number;
  title: string;
  /** 简报：目标、限制、场景简介 */
  brief: string;
  goalText: string;
  items: ItemInstance[];
  targets: SceneTargetDef[];
  initialFlags?: Record<string, unknown>;
  recipes: Recipe[];
  solutions: Solution[];
}

/** 玩家一次尝试的操作 */
export type Operation =
  | { kind: 'combine'; instanceIds: string[] }
  | { kind: 'use'; instanceId: string; targetId: string; verb?: Verb };

/** 运行期游戏状态 */
export interface GameState {
  levelId: string;
  inventory: ItemInstance[];
  scene: Record<string, Record<string, unknown>>; // targetId -> state
  flags: Record<string, unknown>;
  nextInstanceId: number;
}

/** 操作结果 */
export interface OperationResult {
  ok: boolean;
  kind: 'success' | 'failure' | 'neutral' | 'no-recipe';
  recipe?: Recipe;
  feedback: string;
  produced: ItemInstance[];
  consumed: string[];
  sceneChanges: { targetId: string; state: Record<string, unknown> }[];
  flagChanges: { key: string; value: unknown }[];
  galleryNote?: string;
  matchedBy?: 'recipe' | 'generic';
}

/** 撤销/重放命令记录 */
export interface CommandRecord {
  before: GameState;
  operation: Operation;
  after: GameState;
  result: OperationResult;
}
