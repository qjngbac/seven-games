import { ActionDef, DeviceDef, FaultDef, ResultData, SymptomInstance, TimelineEntry, WorkOrder } from './types'
import { SimulationWorld } from './simulation'
import { deviceSymptoms, sceneInsight } from './symptoms'
import { DEVICE_BY_ID } from '../data/devices'
import { ACTION_BY_ID } from '../data/actions'
import { FAULT_BY_ID, faultResolved } from '../data/faults'

export type Phase = 'briefing' | 'site' | 'result'

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
    const a = ACTION_BY_ID[actionId]
    if (!a) return { ok: false, reason: '未知操作', log: '', risk: 0, damage: 0 }
    const check = this.canApply(actionId, target)
    if (!check.ok) {
      this.log.unshift(`✋ ${check.reason}`)
      return { ok: false, reason: check.reason, log: check.reason ?? '', risk: 0, damage: 0 }
    }

    // 违反约束（如禁止恢复出厂却用了）
    if (this.wo.constraints.noFactoryReset && a.highRisk && (a.id === 'factory_reset' || a.id === 'delete_recordings')) {
      this.violated = true
    }

    const fx = typeof a.effects === 'function' ? a.effects(target as string) : a.effects
    this.world.applyActionEffects(fx, target)

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

  /** 提交并结算 */
  submit(): ResultData {
    this.phase = 'result'
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
    // 高效奖励
    if (cleared && !this.timeOverdue()) score += 5
    score = Math.max(0, Math.min(100, Math.round(score)))

    let satisfaction = 100 - damageCount - riskyCount * 15
    if (this.violated) satisfaction -= 40
    satisfaction = Math.max(0, Math.min(100, satisfaction))

    let grade: ResultData['grade'] = 'F'
    if (cleared) {
      if (score >= 95) grade = 'S'
      else if (score >= 80) grade = 'A'
      else if (score >= 65) grade = 'B'
      else if (score >= 50) grade = 'C'
      else grade = 'F'
    }

    const deviation = this.computeDeviation()

    return {
      cleared,
      title: cleared ? (rootFixed ? '根因已消除' : '临时修好（根因仍在）') : '工单失败',
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
      funny: this.wo.funnyFeedback
    }
  }

  /** 第一次偏离参考解法的位置（按动作 id 比对，忽略目标） */
  private computeDeviation(): string | null {
    const ref = this.wo.referencePath
    for (let i = 0; i < ref.length; i++) {
      const playerStep = this.timeline[i]
      if (!playerStep || playerStep.actionId !== ref[i].action) {
        const expected = ACTION_BY_ID[ref[i].action]?.name ?? ref[i].action
        const got = playerStep ? ACTION_BY_ID[playerStep.actionId]?.name ?? playerStep.actionId : '（提前提交）'
        return `第 ${i + 1} 步：参考做法是「${expected}」，你做了「${got}」`
      }
    }
    return null
  }
}
