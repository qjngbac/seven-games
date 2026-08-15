import { DeviceDef, EffectSpec, FaultDef, StateValue, WorldView } from './types'

/**
 * 模拟世界：保存设备组件状态并按依赖图传播。
 * - base：可被动作/故障直接写入的基础状态
 * - derived：由 derive 函数计算，每次变更后重算，玩家不可直接设置
 */
export class SimulationWorld {
  devices: DeviceDef[]
  private base = new Map<string, StateValue>()
  private derived = new Map<string, StateValue>()
  private faultIds: string[] = []

  constructor(devices: DeviceDef[], faults: FaultDef[] = []) {
    this.devices = devices
    this.init(faults)
  }

  private key(device: string, comp: string): string {
    return `${device}.${comp}`
  }

  private view: WorldView = {
    get: (device, comp) => this.get(device, comp)
  }

  get View(): WorldView {
    return this.view
  }

  get(device: string, comp: string): StateValue | undefined {
    const k = this.key(device, comp)
    if (this.derived.has(k)) return this.derived.get(k)
    return this.base.get(k)
  }

  setBase(device: string, comp: string, value: StateValue): void {
    this.base.set(this.key(device, comp), value)
  }

  /** 初始化基础状态 + 注入故障 + 传播派生 */
  init(faults: FaultDef[]): void {
    this.base.clear()
    this.derived.clear()
    this.faultIds = faults.map((f) => f.id)
    for (const d of this.devices) {
      for (const c of d.components) {
        if (c.derive) continue
        this.base.set(this.key(d.id, c.key), c.initial ?? false)
      }
    }
    for (const f of faults) {
      for (const e of f.inject) this.applyEffect(e, undefined)
    }
    this.recompute()
  }

  getFaults(): string[] {
    return this.faultIds
  }

  private applyEffect(e: EffectSpec, target?: string): void {
    const device = e.target ? target! : e.device!
    const set = typeof e.set === 'function' ? e.set(this.view) : e.set
    this.setBase(device, e.comp, set)
  }

  /** 依赖拓扑传播：反复重算派生组件直到稳定 */
  recompute(): void {
    const derived: { device: string; comp: string; derive: NonNullable<DeviceDef['components'][number]['derive']> }[] = []
    for (const d of this.devices) {
      for (const c of d.components) {
        if (c.derive) derived.push({ device: d.id, comp: c.key, derive: c.derive })
      }
    }
    const maxPasses = derived.length + 4
    let changed = true
    let pass = 0
    while (changed && pass < maxPasses) {
      changed = false
      pass++
      for (const item of derived) {
        const k = this.key(item.device, item.comp)
        const old = this.derived.get(k)
        const val = item.derive(this.view)
        if (old !== val) {
          this.derived.set(k, val)
          changed = true
        }
      }
    }
  }

  /** 执行动作效果并传播 */
  applyActionEffects(effects: EffectSpec[] | undefined, target?: string): void {
    if (!effects) return
    for (const e of effects) this.applyEffect(e, target)
    this.recompute()
  }

  /** 强制把所有状态复制到快照（用于复盘重建） */
  snapshot(): Record<string, StateValue> {
    const out: Record<string, StateValue> = {}
    for (const [k, v] of this.base) out[k] = v
    for (const [k, v] of this.derived) out[k] = v
    return out
  }
}
