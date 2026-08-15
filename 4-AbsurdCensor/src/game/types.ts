// 《荒诞审查局》核心数据模型
// 原则（来自设计文档）：
// - 规则必须明确可查，错误依靠「字段逻辑差异」而非像素级刁难。
// - 文件之间存在可验证的一致性关系。
// - 合法性（制度上是否正确）与道德/剧情后果必须分开记录。

// ---------- 规则 DSL ----------

export type RuleOp =
  | 'requireDocument' // 必须持有某类证件
  | 'requireField' // 条件成立时，某证件某字段须满足比较
  | 'fieldMatch' // 两证件某字段须相等（一致性）
  | 'fieldInList' // 某证件某字段值须在允许集合内
  | 'notExpired' // 某证件须在有效期内（issueDate + validityDays）
  | 'allowIf' // 条件成立 → 例外允许（高优先级）
  | 'denyIf' // 条件成立 → 例外禁止（高优先级）
  | 'forbidDocument' // 持有某类证件 → 拒绝

export interface WhenCond {
  // 通用条件：key 对应 person 的属性。
  // species: person.species === value
  // carries: person.carries 数组包含 value
  // origin / purpose / name 等：person[key] === value
  [attr: string]: string
}

export interface Rule {
  id: string
  op: RuleOp
  priority: number // 越小越基础；例外用高优先级（如 100）
  explain: string // 给玩家看的条款文本（与执行逻辑保持一致）

  // requireDocument / forbidDocument / notExpired
  docType?: string

  // requireField / fieldInList / notExpired
  when?: WhenCond
  doc?: string // 指向 case 中某份文档 id
  field?: string
  compare?: '>=' | '<=' | '==' | '!=' | '>'
  value?: string | number
  allowed?: (string | number)[] // fieldInList 的允许集合

  // notExpired
  validityDays?: number // 证件自签发日起有效天数；缺省按 issueDate 判定

  // fieldMatch
  aDoc?: string
  aField?: string
  bDoc?: string
  bField?: string
}

export interface DayRules {
  date: number
  title: string
  today: string // 当天日期 YYYY-MM-DD（供有效期规则计算）
  brief: string // 当天晨报公告
  news: string // 当天背景新闻
  isNew?: string[] // 当天新增规则的 id（UI 高亮用）
  rules: Rule[]
  quota: number // 当天至少处理人数
}

/** 一个「审查场景」：有独立世界观、规则体系与申请者。 */
export interface Scene {
  id: string
  name: string // 场景名（如「边境哨卡」）
  icon: string // 首页卡片 emoji
  blurb: string // 首页一句话简介
  intro: string // 进入场景时的世界观描述
  // 该场景特有的叙事标签（用于结局/事件，可选扩展）
  signatureTag?: string
  days: DayRules[]
}

// ---------- 申请者 / 文件 ----------

export interface CaseDocument {
  id: string
  type: string // 证件类型，与 Rule.docType 对应
  title: string
  fields: Record<string, string | number>
  issueDate?: string // YYYY-MM-DD
  authentic: boolean // 真伪；伪造 = false
  note?: string // 字段说明（如「手写补丁」「公章可疑」）
}

export interface PersonState {
  species?: string // robot / human / cat / alien ...
  carries?: string[] // 携带物（含动物/物品）
  origin?: string
  purpose?: string
  name?: string
  [k: string]: string | string[] | undefined
}

export type Decision = 'allow' | 'deny' | 'detain'

export interface ApplicantCase {
  id: string
  name: string
  portrait: string // emoji 占位美术
  person: PersonState
  statement: string // 口头陈述
  documents: CaseDocument[]
  items: string[] // 携带物品（与人类可读）
  truth: string // 真实状态（日结揭示用）
  storyTags: string[] // 叙事标签（延迟后果/结局）
  // 合法裁决由 RuleEvaluator 预计算（CaseGenerator 反向验证）
  expected: Decision
  // 道德冲突：玩家在「合法」与「善良」之间如何选
  moral?: {
    hint: string // 给玩家的隐性提示（如「他看起来很慌」）
    kindConscience: Decision // 顺着良心选（可能非法/低效）
  }
}

// ---------- 评估 / 结算 ----------

export interface ReasonEntry {
  ruleId: string
  rule: Rule
  kind: 'violation' | 'satisfied' | 'exception'
  text: string
}

export interface EvalResult {
  allowLegal: boolean
  denyLegal: boolean
  detainLegal: boolean
  reasons: ReasonEntry[]
}

export interface CaseOutcome {
  caseId: string
  decision: Decision
  expected: Decision
  legalCorrect: boolean // 与制度合法裁决一致
  isWrongAllow: boolean // 本应拒绝却放行
  isWrongDeny: boolean // 本应放行却拒绝
  penalty: number // 罚款
  conscienceDelta: number // 良心变化
  storyEffects: string[] // 触发的叙事标签
}

export interface DayResult {
  date: number
  processed: number
  correct: number
  wrongAllow: number
  wrongDeny: number
  detainCount: number
  accuracy: number // 0..1（仅算 allow/deny 的合法率）
  salary: number
  penalty: number
  net: number
  orgPressure: number // 组织压力累计
  conscience: number // 良心值
  outcomes: CaseOutcome[]
  events: string[] // 当天剧情消息
}
