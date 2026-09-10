// 核心数据模型：设备状态是唯一事实来源，症状由状态推导，操作只修改声明的状态。
// 所有内容（设备/故障/动作/工单）都在 src/data 中以数据驱动方式定义。

export type StateValue = boolean | number | string

/** 只读世界视图，供 derive / condition / requirements 函数读取组件状态 */
export interface WorldView {
  get(device: string, comp: string): StateValue | undefined
}

/** 把组件值当作布尔读取（非 false / 非 0 / 非空串 视为真） */
export function bv(w: WorldView, device: string | undefined, comp: string): boolean {
  if (!device) return false
  const v = w.get(device, comp)
  return v === true || v === 1 || v === 'true' || v === 'on'
}

export interface ComponentDef {
  key: string
  label: string
  /** 是否显示在状态面板上（灯光/文字） */
  observable: boolean
  /** 基础初始值（有 derive 则为派生，不在此初始化） */
  initial?: StateValue
  /** 派生计算：结果由其它组件决定，玩家不可直接设置 */
  derive?: (w: WorldView) => StateValue
  hint?: string
}

export interface DeviceDef {
  id: string
  name: string
  type: string
  icon: string
  desc?: string
  components: ComponentDef[]
}

export type Severity = 'info' | 'warn' | 'error'

export interface SymptomInstance {
  device: string
  deviceName: string
  severity: Severity
  display: string
}

export interface FaultDef {
  id: string
  label: string
  /** 关卡开始时注入的基础状态变更（根因） */
  inject: EffectSpec[]
  /** 根因是否已消除：注入的副作用是否被撤销。用于结算 rootCauseFixed。target 为针对某设备的故障。 */
  resolved?: (w: WorldView, target?: string) => boolean
}

/** 状态变更说明。device 直接指定；或 target:true 表示使用动作目标设备 */
export interface EffectSpec {
  device?: string
  target?: boolean
  comp: string
  set: StateValue | ((w: WorldView) => StateValue)
}

export type ActionCategory = 'inspect' | 'repair' | 'risky' | 'restart'

export interface ActionDef {
  id: string
  name: string
  tool?: string
  category: ActionCategory
  desc: string
  /** 离散时间步 */
  time: number
  /** 风险 0-3 */
  risk: number
  reversible: boolean
  /** 高危不可逆，需要二次确认 */
  highRisk?: boolean
  /** 需要先在场景中选择一个设备 */
  requiresTarget?: boolean
  /** 前置条件（如仅对摄像头有意义） */
  requirements?: (w: WorldView, target?: string) => boolean
  reqHint?: string
  /** 执行时写入的基础状态变更（可为函数，按目标设备生成） */
  effects?: EffectSpec[] | ((target: string) => EffectSpec[])
  /** 检查类动作在日志中披露的证据（人类可读） */
  reveal?: (w: WorldView, target?: string) => string
  /** 执行后的反馈日志模板 */
  log: string
  /** 副作用损失（用于结算） */
  damage?: number
}

export interface AcceptSpec {
  device: string
  comp: string
  equals: StateValue
}

export interface CustomerMessage {
  atTime: number
  text: string
}

export interface WorkOrder {
  id: string
  title: string
  chapter: number
  scene: string
  /** 客户描述（可能不完全准确） */
  customer: string
  customerAccurate: boolean
  constraints: { timeBudget?: number; budget?: number; noFactoryReset?: boolean }
  devices: string[]
  /** 注入的根因；target 用于“针对某台设备”的故障（如某摄像头网口松） */
  faults: { fault: string; target?: string }[]
  availableActions: string[]
  acceptance: AcceptSpec[]
  /** 搞笑反馈 */
  funnyFeedback: string
  /** 参考解法路径（用于评分基线 + 可解性测试） */
  referencePath: { action: string; target?: string }[]
  customerMessages?: CustomerMessage[]
  tutorial?: string
}

export interface TimelineEntry {
  step: number
  time: number
  actionId: string
  actionName: string
  target?: string
  log: string
  risk: number
  damage: number
  /** 该步执行后的完整状态快照，用于复盘重建 */
  stateAfter?: Record<string, StateValue>
}

export interface ResultData {
  cleared: boolean
  title: string
  grade: 'S' | 'A' | 'B' | 'C' | 'F'
  score: number
  timeUsed: number
  timeBudget: number
  budgetUsed: number
  damageCount: number
  riskyCount: number
  absurdCount: number
  rootCauseFixed: boolean
  satisfaction: number
  deviation: string | null
  timeline: TimelineEntry[]
  funny: string
  /** 本次工单造成的不可逆损失（配置/录像/门体）。空数组表示没有任何永久损害。 */
  collateralLosses: { actionId: string; actionName: string; target?: string; comp: string }[]
}
