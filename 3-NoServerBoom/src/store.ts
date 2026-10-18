import { defineStore } from 'pinia'
import { computed, markRaw, ref, shallowRef } from 'vue'
import { WorkOrderController } from './game/controller'
import { WORK_ORDER_BY_ID, WORK_ORDERS } from './data/workorders'
import { ACTION_BY_ID } from './data/actions'
import { AcceptSpec, ActionDef, DeviceDef, ResultData } from './game/types'
import { sound } from './game/audio'

type Screen = 'list' | 'briefing' | 'site' | 'result'

const SAVE_KEY = 'no_server_boom_save_v1'

interface SaveState {
  completed: string[]
  grades: Record<string, string>
  bestScores: Record<string, number>
}

export interface WorkOrderHistoryRecord {
  id: string
  workOrderId: string
  title: string
  chapter: number
  timestamp: string
  cleared: boolean
  grade: 'S' | 'A' | 'B' | 'C' | 'F'
  score: number
  timeUsed: number
  timeBudget: number
  damageCount: number
  riskyCount: number
  boom?: boolean
  boomReason?: string
  funny?: string
}

const HISTORY_KEY = 'no_server_boom_history_v1'

function loadHistory(): WorkOrderHistoryRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return []
}

function persistHistory(records: WorkOrderHistoryRecord[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, 200)))
  } catch {
    /* ignore */
  }
}

function loadSave(): SaveState {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return { completed: [], grades: {}, bestScores: {} }
}
function persistSave(s: SaveState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

export const useGameStore = defineStore('game', () => {
  const screen = ref<Screen>('list')
  const controller = shallowRef<WorkOrderController | null>(null)
  const version = ref(0) // 每次状态变更自增，驱动 computed 重算
  const selectedTarget = ref<string | undefined>(undefined)
  const pendingAction = ref<string | null>(null)
  const result = ref<ResultData | null>(null)
  const lastWarn = ref<string | null>(null)
  const savedProgress = ref<SaveState>(loadSave())
  const history = ref<WorkOrderHistoryRecord[]>(loadHistory())
  const inspectedDevices = ref<Set<string>>(new Set())

  function clearAllHistory() {
    history.value = []
    try {
      localStorage.removeItem(HISTORY_KEY)
    } catch {
      /* ignore */
    }
  }

  const workOrders = WORK_ORDERS
  const active = computed(() => controller.value)
  const wo = computed(() => controller.value?.wo ?? null)

  const symptoms = computed(() => {
    version.value
    return controller.value?.symptoms() ?? []
  })
  const insight = computed(() => {
    version.value
    return controller.value?.insight() ?? null
  })
  const devices = computed<DeviceDef[]>(() => {
    version.value
    return controller.value?.deviceList() ?? []
  })
  const timeUsed = computed(() => {
    version.value
    return controller.value?.timeUsed ?? 0
  })
  const timeBudget = computed(() => {
    version.value
    return controller.value?.wo.constraints.timeBudget ?? 0
  })
  const timeline = computed(() => {
    version.value
    return controller.value?.timeline ?? []
  })
  const logLines = computed(() => {
    version.value
    return controller.value?.log ?? []
  })

  const COMP_DESC_MAP: Record<string, Record<string, string>> = {
    cam1: { portOk: '摄像头 A 网线接入', videoAvailable: '摄像头 A 监控画面正常', online: '摄像头 A 在线' },
    cam2: { portOk: '摄像头 B 网线接入', videoAvailable: '摄像头 B 监控画面正常', online: '摄像头 B 在线' },
    cam3: { portOk: '摄像头 C 网线接入', videoAvailable: '摄像头 C 监控画面正常', online: '摄像头 C 在线' },
    cam4: { portOk: '摄像头 D 网线接入', videoAvailable: '摄像头 D 监控画面正常', online: '摄像头 D 在线' },
    server: { serviceRunning: '服务器关键业务服务正常运行', tempHigh: '服务器机身温度正常', netUp: '服务器网络连通', diskFull: '服务器系统盘空间充足' },
    nvr: { recording: 'NVR 监控录像正常存储', powered: 'NVR 主机供电正常' },
    sw_core: { powered: 'PoE 交换机供电正常', poeUp: 'PoE 供电模块正常输出' },
    door1: { openOk: '门禁锁体处于可开锁状态', powered: '门禁控制器供电正常' },
    printer: { usable: '网络打印机可正常打印' },
    pc1: { usable: '台式机 ① 恢复正常可用状态', osBooted: '台式机 ① 操作系统正常启动' },
    pc2: { usable: '台式机 ② 恢复正常可用状态', osBooted: '台式机 ② 操作系统正常启动' },
    sdoor: { doorOk: '智能感应门正常平稳启闭' },
    cab_trunk: { linkOk: '主干网络线缆物理导通' },
    pw_main: { mainsOk: '市电配电回路供电正常' },
    ups1: { upsOk: 'UPS 后备电源待机正常' },
    ac1: { acOk: '机房精密空调正常制冷' },
    router1: { wanUp: '核心网关外网链路连通' },
    ap1: { apOk: '无线 AP 发射正常工作' },
    fiber1: { fiberOk: '光纤主干传输链路正常' },
  }

  function friendlyAcceptDesc(device: string, comp: string, equals: unknown): string {
    const known = COMP_DESC_MAP[device]?.[comp]
    if (known) return `${known} (${equals === true ? '已达标' : equals === false ? '已消除' : String(equals)})`
    return `${device}.${comp} = ${String(equals)}`
  }

  function bump() {
    version.value++
  }

  function openWorkOrder(id: string) {
    const def = WORK_ORDER_BY_ID[id]
    if (!def) return
    controller.value = markRaw(new WorkOrderController(def))
    selectedTarget.value = def.devices.length === 1 ? def.devices[0] : undefined
    pendingAction.value = null
    result.value = null
    lastWarn.value = null
    inspectedDevices.value = new Set()
    screen.value = 'briefing'
    bump()
  }

  function startSite() {
    sound.click()
    screen.value = 'site'
  }

  function selectTarget(id: string) {
    sound.click()
    selectedTarget.value = id
  }

  function actionableState(a: ActionDef): { ok: boolean; reason?: string } {
    if (!controller.value) return { ok: false }
    return controller.value.canApply(a.id, selectedTarget.value)
  }

  function chooseAction(actionId: string) {
    const a = ACTION_BY_ID[actionId]
    if (!a || !controller.value) return
    const check = controller.value.canApply(actionId, selectedTarget.value)
    if (!check.ok) {
      sound.warn()
      lastWarn.value = check.reason ?? '当前不可执行'
      return
    }
    if (a.highRisk) {
      sound.warn()
      pendingAction.value = actionId
      return
    }
    applyAction(actionId)
  }

  function applyAction(actionId: string) {
    if (!controller.value) return
    const a = ACTION_BY_ID[actionId]
    const r = controller.value.apply(actionId, selectedTarget.value)
    if (!r.ok) {
      sound.warn()
      lastWarn.value = r.reason ?? '操作失败'
    } else {
      if (controller.value.boom) {
        sound.boom()
        submit()
        return
      }
      if (controller.value.timeOverdue()) {
        sound.lose()
        submit()
        return
      }
      if (a?.category === 'inspect') {
        sound.inspect()
        if (selectedTarget.value) inspectedDevices.value.add(selectedTarget.value)
      } else if (a?.category === 'repair' || a?.category === 'restart') {
        sound.repair()
        if (selectedTarget.value) inspectedDevices.value.add(selectedTarget.value)
      } else {
        sound.click()
      }
      lastWarn.value = null
    }
    bump()
  }

  function confirmHighRisk() {
    if (pendingAction.value) applyAction(pendingAction.value)
    pendingAction.value = null
  }
  function cancelConfirm() {
    sound.click()
    pendingAction.value = null
  }

  const GRADE_RANKS: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, F: 1 }

  function submit() {
    if (!controller.value) return
    result.value = controller.value.submit()
    screen.value = 'result'
    if (result.value.cleared) {
      sound.win()
      const woId = controller.value.wo.id
      if (!savedProgress.value.completed.includes(woId)) {
        savedProgress.value.completed.push(woId)
      }
      const prevGrade = savedProgress.value.grades[woId]
      const curGrade = result.value.grade
      if (!prevGrade || (GRADE_RANKS[curGrade] ?? 0) > (GRADE_RANKS[prevGrade] ?? 0)) {
        savedProgress.value.grades[woId] = curGrade
      }
      const prevScore = savedProgress.value.bestScores[woId] ?? 0
      if (result.value.score > prevScore) {
        savedProgress.value.bestScores[woId] = result.value.score
      }
      persistSave(savedProgress.value)
    } else {
      sound.lose()
    }

    // 记录历史档案（无论成功还是炸机/失败均记录，方便回看复盘）
    const hist: WorkOrderHistoryRecord = {
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      workOrderId: controller.value.wo.id,
      title: controller.value.wo.title,
      chapter: controller.value.wo.chapter,
      timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
      cleared: result.value.cleared,
      grade: result.value.grade,
      score: result.value.score,
      timeUsed: result.value.timeUsed,
      timeBudget: result.value.timeBudget,
      damageCount: result.value.damageCount,
      riskyCount: result.value.riskyCount,
      boom: result.value.boom,
      boomReason: result.value.boomReason,
      funny: result.value.funny,
    }
    history.value.unshift(hist)
    if (history.value.length > 200) history.value.length = 200
    persistHistory(history.value)

    bump()
  }

  function retry() {
    sound.click()
    if (!controller.value) return
    const id = controller.value.wo.id
    openWorkOrder(id)
    screen.value = 'site'
  }

  function backToList() {
    sound.click()
    screen.value = 'list'
    controller.value = null
    selectedTarget.value = undefined
    pendingAction.value = null
    result.value = null
  }

  // 表面状态指示灯，无论是否检查均能直观看到
  const SURFACE_COMPONENTS = new Set([
    'powered',
    'online',
    'videoAvailable',
    'recording',
    'openOk',
    'monitorOn',
    'displayNormal',
    'osBooted',
    'netUp',
    'wanUp',
    'serviceRunning',
    'alarmActive',
    'doorOk',
    'poeUp',
    'usable'
  ])

  // 设备可观察组件状态（用于现场面板）
  function compView(d: DeviceDef): { key: string; label: string; value: unknown; on: boolean; uninspected?: boolean }[] {
    version.value
    const w = controller.value?.world.View
    if (!w) return []
    const isInspected = inspectedDevices.value.has(d.id)
    return d.components
      .filter((c) => c.observable)
      .map((c) => {
        const isInternal = !SURFACE_COMPONENTS.has(c.key)
        if (isInternal && !isInspected) {
          return { key: c.key, label: c.label, value: '待检测', on: false, uninspected: true }
        }
        const v = w.get(d.id, c.key)
        return { key: c.key, label: c.label, value: v, on: v === true || v === 1 || v === 'on' }
      })
  }

  function acceptanceView(): { spec: AcceptSpec; met: boolean; desc: string }[] {
    version.value
    const c = controller.value
    if (!c) return []
    return c.wo.acceptance.map((spec) => ({
      spec,
      met: c.world.get(spec.device, spec.comp) === spec.equals,
      desc: friendlyAcceptDesc(spec.device, spec.comp, spec.equals)
    }))
  }

  return {
    screen,
    controller,
    version,
    selectedTarget,
    pendingAction,
    result,
    lastWarn,
    workOrders,
    active,
    wo,
    symptoms,
    insight,
    devices,
    timeUsed,
    timeBudget,
    timeline,
    logLines,
    savedProgress,
    openWorkOrder,
    startSite,
    selectTarget,
    actionableState,
    chooseAction,
    applyAction,
    confirmHighRisk,
    cancelConfirm,
    submit,
    retry,
    backToList,
    compView,
    acceptanceView,
    history,
    clearAllHistory
  }
})
