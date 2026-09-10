import { ActionDef, DeviceDef, FaultDef, ResultData, SymptomInstance, TimelineEntry, WorkOrder, bv } from './types'
import { SimulationWorld } from './simulation'
import { deviceSymptoms, sceneInsight } from './symptoms'
import { DEVICE_BY_ID } from '../data/devices'
import { ACTION_BY_ID } from '../data/actions'
import { FAULT_BY_ID, faultResolved } from '../data/faults'

export type Phase = 'briefing' | 'site' | 'result'

/**
 * 不可逆损失组件：一旦被置位，说明已造成永久损害（配置/录像/门体），无法通过后续操作恢复。
 * 设计原因：验收条件（acceptance）只描述"目标是否达成"，无法表达"代价"。
 * 若不单独核算，玩家可以"先破坏再修好原故障"而仍被判为满分根因修复。
 */
const IRREVERSIBLE_LOSS_COMPS = ['configLost', 'recordingsLost', 'doorBroken'] as const

/** 一条不可逆损失记录（用于结算披露与复盘） */
export interface CollateralLoss {
  actionId: string
  actionName: string
  target?: string
  comp: string
}

export interface ApplyResult {
  ok: boolean
  reason?: string
  log: string
  risk: number
  damage: number
}

/**
 * 工单调度控制器：状态机 + 离散时间步 + 验收 + 结算 + 时间线。
 * 纯逻辑，不依赖 UI，可直接单元测试。
 */
export class WorkOrderController {
  readonly wo: WorkOrder
  world: SimulationWorld
  phase: Phase = 'briefing'
  timeUsed = 0
  timeline: TimelineEntry[] = []
  log: string[] = []
  violated = false
  /** 已造成的不可逆损失（配置/录像/门体等永久损害） */
  collateral: CollateralLoss[] = []
  /** 结算结果缓存：保证 submit() 幂等，重复提交不会重复计分 */
  private lastResult: ResultData | null = null
  private resolvedCache: { def: FaultDef; target?: string }[] = []

  constructor(wo: WorkOrder) {
    this.wo = wo
    const devices: DeviceDef[] = wo.devices
      .map((id) => DEVICE_BY_ID[id])
      .filter((d): d is DeviceDef => !!d)
    this.world = new SimulationWorld(devices)
    // 注入根因（目标类故障绑定具体设备）
    for (const f of wo.faults) {
      const def = FAULT_BY_ID[f.fault]
      if (!def) continue
      this.world.applyActionEffects(def.inject, f.target)
      this.resolvedCache.push({ def, target: f.target })
    }
  }

  /** 当前可观察症状 */
  symptoms(): SymptomInstance[] {
    const out: SymptomInstance[] = []
    for (const id of this.wo.devices) {
      const d = DEVICE_BY_ID[id]
      if (d) out.push(...deviceSymptoms(d, this.world.View))
    }
    return out
  }

  insight(): string | null {
    const devs = this.wo.devices.map((id) => DEVICE_BY_ID[id]).filter(Boolean) as DeviceDef[]
    return sceneInsight(devs, this.world.View)
  }

  deviceList(): DeviceDef[] {
    return this.wo.devices.map((id) => DEVICE_BY_ID[id]).filter(Boolean) as DeviceDef[]
  }

  actionById(id: string): ActionDef | undefined {
    return ACTION_BY_ID[id]
  }

  /** 某动作当前是否可用（前置条件 + 需要目标） */
  canApply(actionId: string, target?: string): { ok: boolean; reason?: string } {
    const a = ACTION_BY_ID[actionId]
    if (!a) return { ok: false, reason: '未知操作' }
    if (a.requiresTarget && !target) return { ok: false, reason: '需要先选择一台设备' }
    if (a.requirements && !a.requirements(this.world.View, target)) {
      return { ok: false, reason: a.reqHint ?? '当前不满足前置条件' }
    }
    return { ok: true }
  }

  /** 执行操作。高危操作由调用方（UI）先完成二次确认后再调用。 */
  apply(actionId: string, target?: string): ApplyResult {
    // 状态机守卫：结算后不允许继续改动世界状态（否则可在结算后追加时间线并重复结算）
    if (this.phase === 'result') {
      return { ok: false, reason: '工单已结算，不能继续操作', log: '', risk: 0, damage: 0 }
    }
    const a = ACTION_BY_ID[actionId]
    if (!a) return { ok: false, reason: '未知操作', log: '', risk: 0, damage: 0 }
    const check = this.canApply(actionId, target)
    if (!check.ok) {
      this.log.unshift(`✋ ${check.reason}`)
      return { ok: false, reason: check.reason, log: check.reason ?? '', risk: 0, damage: 0 }
    }

    // 违反约束（如禁止恢复出厂却用了）
    // 说明：noFactoryReset 的语义是"禁止一切高危不可逆操作"，因此按 highRisk && !reversible 判定，
    // 而不是逐个列举动作 id —— 否则 force_break（破拆）这类同样不可逆的高危动作会被漏掉。
    if (this.wo.constraints.noFactoryReset && a.highRisk && a.reversible === false) {
      this.violated = true
    }

    const fx = typeof a.effects === 'function' ? a.effects(target as string) : a.effects
    // 记录执行前的不可逆损失状态，用于识别"本次操作是否新增了永久损害"
    const lossBefore = new Map<string, boolean>()
    for (const comp of IRREVERSIBLE_LOSS_COMPS) lossBefore.set(comp, bv(this.world.View, target, comp))
    this.world.applyActionEffects(fx, target)
    for (const comp of IRREVERSIBLE_LOSS_COMPS) {
      if (!lossBefore.get(comp) && bv(this.world.View, target, comp)) {
        this.collateral.push({ actionId: a.id, actionName: a.name, target, comp })
      }
    }

    const step = this.timeline.length + 1
    this.timeUsed += a.time
    const reveal = a.reveal ? a.reveal(this.world.View, target) : a.log
    const displayLog = a.category === 'inspect' ? `🔍 ${reveal}` : `🔧 ${a.log}`
    this.log.unshift(displayLog)

    const entry: TimelineEntry = {
      step,
      time: this.timeUsed,
      actionId: a.id,
      actionName: a.name,
      target,
      log: displayLog,
      risk: a.risk,
      damage: a.damage ?? 0,
      stateAfter: this.world.snapshot()
    }
    this.timeline.push(entry)
    return { ok: true, log: displayLog, risk: a.risk, damage: a.damage ?? 0 }
  }

  /** 验收：所有 accept 条件是否满足 */
  acceptanceMet(): boolean {
    return this.wo.acceptance.every((acc) => this.world.get(acc.device, acc.comp) === acc.equals)
  }

  rootCauseFixed(): boolean {
    return this.resolvedCache.every((r) => faultResolved(r.def, r.target, this.world.View))
  }

  timeOverdue(): boolean {
    const budget = this.wo.constraints.timeBudget
    return budget !== undefined && this.timeUsed > budget
  }

  /** 提交并结算。幂等：重复调用返回同一份结果，不会重复计分。 */
  submit(): ResultData {
    if (this.lastResult) return this.lastResult
    this.phase = 'result'
    const lost = this.collateral.length > 0
    const cleared = this.acceptanceMet() && !this.violated && !this.timeOverdue()
    const rootFixed = this.rootCauseFixed()

    let score = 100
    let damageCount = 0
    let riskyCount = 0
    let absurdCount = 0
    for (const e of this.timeline) {
      damageCount += e.damage
      if (e.risk >= 2) {
        riskyCount++
        absurdCount++
      }
      score -= e.damage
    }
    if (this.timeOverdue()) score -= (this.timeUsed - (this.wo.constraints.timeBudget ?? 0)) * 2
    if (this.violated) score -= 40
    if (!rootFixed) score -= 20
    // 不可逆损失额外扣分（与 damage 不重复：damage 计"操作代价"，此处计"永久损害"）
    score -= 10 * this.collateral.length
    // 高效奖励
    if (cleared && !this.timeOverdue()) score += 5
    score = Math.max(0, Math.min(100, Math.round(score)))

    let satisfaction = 100 - damageCount - riskyCount * 15
    if (this.violated) satisfaction -= 40
    // 永久损害对客户满意度是硬伤
    satisfaction -= 15 * this.collateral.length
    satisfaction = Math.max(0, Math.min(100, satisfaction))

    let grade: ResultData['grade'] = 'F'
    if (cleared) {
      if (score >= 95) grade = 'S'
      else if (score >= 80) grade = 'A'
      else if (score >= 65) grade = 'B'
      else if (score >= 50) grade = 'C'
      else grade = 'F'
      // 只要造成了不可逆损失，评价上限封顶 C：不能用"毁掉配置"换来 S/A/B
      if (lost && (grade === 'S' || grade === 'A' || grade === 'B')) grade = 'C'
    }

    let title: string
    if (!cleared) title = '工单失败'
    else if (lost) title = rootFixed ? '根因已消除（但造成不可逆损失）' : '临时修好（根因仍在，且造成不可逆损失）'
    else title = rootFixed ? '根因已消除' : '临时修好（根因仍在）'

    const deviation = this.computeDeviation(cleared && rootFixed)

    const result: ResultData = {
      cleared,
      title,
      grade,
      score,
      timeUsed: this.timeUsed,
      timeBudget: this.wo.constraints.timeBudget ?? 0,
      budgetUsed: damageCount,
      damageCount,
      riskyCount,
      absurdCount,
      rootCauseFixed: rootFixed,
      satisfaction,
      deviation,
      timeline: this.timeline,
      funny: this.wo.funnyFeedback,
      collateralLosses: [...this.collateral]
    }
    this.lastResult = result
    return result
  }

  /**
   * 第一次偏离参考解法的位置（按动作 id 比对，忽略目标）。
   * achieved=true 表示玩家虽未走参考路径、但已达成目标 —— 此时文案改为"对照提示"而非"失误"，
   * 避免把等价正确解（如用 restart_camera 替代 fix_ip）误报成偏离。
   */
  private computeDeviation(achieved: boolean): string | null {
    const ref = this.wo.referencePath
    for (let i = 0; i < ref.length; i++) {
      const playerStep = this.timeline[i]
      if (!playerStep || playerStep.actionId !== ref[i].action) {
        const expected = ACTION_BY_ID[ref[i].action]?.name ?? ref[i].action
        const got = playerStep ? ACTION_BY_ID[playerStep.actionId]?.name ?? playerStep.actionId : '（提前提交）'
        const prefix = achieved ? '（非参考路径但已达成目标）' : ''
        return `${prefix}第 ${i + 1} 步：参考做法是「${expected}」，你做了「${got}」`
      }
    }
    return null
  }
}
