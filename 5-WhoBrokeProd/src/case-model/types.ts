// 案件模型核心类型定义
// 设计原则（见开发文档 §5/§6）：先定义客观真相，再生成角色视角。
// 角色回答只是各自有限视角，不代表作者旁白。所有可验证事实都能映射到 TruthEvent / Evidence。

export type FactId = string
export type CharacterId = string
export type EvidenceId = string
export type TopicId = string
export type EventId = string

/** 客观真相事件：案件背后确定存在的一条事件链节点。 */
export interface TruthEvent {
  id: EventId
  time: string // "03:02" 24h 制
  location: string
  actors: CharacterId[]
  action: string // 规范动作描述（验收时比对）
  cause?: string
  facts: FactId[] // 该事件客观成立的事实集合（用于验收与证据映射）
}

/** 角色定义。 */
export interface CharacterDef {
  id: CharacterId
  name: string
  role: string // 职位 / 身份
  avatar?: string // emoji 占位美术
  blurb: string // 一句简介
}

/**
 * 角色知识（有限视角）。每个角色只知道自己观察到或听说的子图。
 * intent 区分：诚实 / 撒谎 / 误解 / 记错 / 隐瞒。
 */
export interface CharacterKnowledge {
  character: CharacterId
  observed: FactId[] // 亲眼所见
  heard: FactId[] // 听说
  beliefs: FactId[] // 以为成立（可能错误）
  intent: 'honest' | 'lie' | 'misunderstand' | 'forget' | 'secret'
  secrets: FactId[] // 知道但不愿主动说，需出示证据才吐露
}

/** 回答触发条件。 */
export interface ResponseCond {
  discoveredFacts?: FactId[] // 玩家已发现（看过证据/听过证词）这些事实
  presentedEvidence?: EvidenceId[] // 已对该角色出示过这些证据
  askedTopics?: TopicId[] // 已问过这些话题
  notAskedTopics?: TopicId[] // 尚未问过这些话题
  minTrust?: number // 关系值阈值
}

/** 对白回答版本。 */
export interface DialogueResponse {
  id: string
  when?: ResponseCond // 触发条件（缺省恒为真，作为兜底版本）
  facts: FactId[] // 本版本提供的（真实或虚假）事实
  text: string
  priority: number // 越大越优先
  unlocks?: TopicId[] // 说完解锁的话题
  revealsEvidence?: EvidenceId[] // 说完直接给出证据
  shakeTrust?: number // 对关系值的影响（如撒谎被拆穿 -10）
}

/** 话题：玩家可询问的一个主题。 */
export interface Topic {
  id: TopicId
  subject: string // 话题标题
  ask: string // 玩家点这个话题时说的话
  unlock?: ResponseCond // 解锁条件（缺省初始可用）
  responses: DialogueResponse[]
}

/** 证据：可被玩家直接检视的记录（如 Git 日志、门禁记录、聊天截图）。 */
export interface Evidence {
  id: EvidenceId
  name: string
  source: string // 来源
  reliability: number // 0..1 可信度
  facts: FactId[] // 证据支持的事实
  desc: string
}

/** 玩家最终指控。 */
export interface Claim {
  actors: CharacterId[] // 可指认多人（含管理责任）
  action: string // 玩家描述的"危险操作"
  time: string // 玩家指认的时间
  motive: string // 动机
  evidence: EvidenceId[] // 引用的证据
  facts: FactId[] // 玩家标记的关键事实（推理板已连接 / 已发现）
}

/** 验收条件（结构化，不用字符串匹配）。 */
export interface Acceptance {
  /** 必须指认的主要责任人（缺一则不算成功）。 */
  responsible: CharacterId[]
  /** 可额外指认的"次要 / 管理责任"，指认了算满分、漏了算部分成功。 */
  contributory?: CharacterId[]
  /** 必须正确描述的危险行为（比对 TruthEvent.action 规范表述）。 */
  action: string
  /** 危险行为的等价表述（可选，便于玩家用不同措辞指控）。 */
  actionAliases?: string[]
  /** 必须引用的一组关键证据。 */
  requiredEvidence?: EvidenceId[]
  /** 至少引用多少条关键证据（与 requiredEvidence 取并集判定，缺省为 requiredEvidence 全量）。 */
  minEvidence?: number
  /** 必须成立的关键事实（玩家已发现）。 */
  requiredFacts?: FactId[]
  /** 时间容差（分钟），缺省 0 表示精确匹配。 */
  timeWindowMin?: number
}

/** 案件完整定义（数据驱动）。 */
export interface CaseDef {
  id: string
  title: string
  chapter: number
  brief: string // 案件档案：目标 + 已知事实
  intro: string // 开场叙述
  characters: CharacterDef[]
  truthEvents: TruthEvent[]
  knowledge: CharacterKnowledge[]
  evidence: Evidence[]
  topics: Record<CharacterId, Topic[]>
  acceptance: Acceptance
  contradictions?: Array<[FactId, FactId]> // 互斥事实对（推理板自动识别）
  supports?: Array<[FactId, FactId]> // 互证事实对（可选）
  factLabels?: Record<FactId, string> // 事实的人类可读标签（推理板展示用）
  maxActions?: number // 提问行动点预算；缺省充足
  ending: {
    success: string
    partial: string
    fail: string
  }
}

/** 指控校验结果。 */
export interface ClaimVerdict {
  outcome: 'success' | 'partial' | 'fail'
  correctActors: boolean
  missingResponsible: CharacterId[]
  wrongActors: CharacterId[]
  missingEvidence: EvidenceId[]
  missingFacts: FactId[]
  missingContributory: CharacterId[]
  message: string
}
