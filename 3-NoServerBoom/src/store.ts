import { defineStore } from 'pinia'
import { computed, markRaw, ref, shallowRef } from 'vue'
import { WorkOrderController } from './game/controller'
import { WORK_ORDER_BY_ID, WORK_ORDERS } from './data/workorders'
import { ACTION_BY_ID } from './data/actions'
import { AcceptSpec, ActionDef, DeviceDef, ResultData } from './game/types'

type Screen = 'list' | 'briefing' | 'site' | 'result'

export const useGameStore = defineStore('game', () => {
  const screen = ref<Screen>('list')
  const controller = shallowRef<WorkOrderController | null>(null)
  const version = ref(0) // 每次状态变更自增，驱动 computed 重算
  const selectedTarget = ref<string | undefined>(undefined)
  const pendingAction = ref<string | null>(null)
  const result = ref<ResultData | null>(null)
  const lastWarn = ref<string | null>(null)

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

  function bump() {
    version.value++
  }

  function openWorkOrder(id: string) {
    const def = WORK_ORDER_BY_ID[id]
    if (!def) return
    controller.value = markRaw(new WorkOrderController(def))
    selectedTarget.value = undefined
    pendingAction.value = null
    result.value = null
    lastWarn.value = null
    screen.value = 'briefing'
    bump()
  }

  function startSite() {
    screen.value = 'site'
  }

  function selectTarget(id: string) {
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
      lastWarn.value = check.reason ?? '当前不可执行'
      return
    }
    if (a.highRisk) {
      pendingAction.value = actionId
      return
    }
    applyAction(actionId)
  }

  function applyAction(actionId: string) {
    if (!controller.value) return
    const r = controller.value.apply(actionId, selectedTarget.value)
    if (!r.ok) lastWarn.value = r.reason ?? '操作失败'
    else lastWarn.value = null
    bump()
  }

  function confirmHighRisk() {
    if (pendingAction.value) applyAction(pendingAction.value)
    pendingAction.value = null
  }
  function cancelConfirm() {
    pendingAction.value = null
  }

  function submit() {
    if (!controller.value) return
    result.value = controller.value.submit()
    screen.value = 'result'
    bump()
  }

  function retry() {
    if (!controller.value) return
    const id = controller.value.wo.id
    openWorkOrder(id)
    screen.value = 'site'
  }

  function backToList() {
    screen.value = 'list'
    controller.value = null
    selectedTarget.value = undefined
    pendingAction.value = null
    result.value = null
  }

  // 设备可观察组件状态（用于现场面板）
  function compView(d: DeviceDef): { key: string; label: string; value: unknown; on: boolean }[] {
    version.value
    const w = controller.value?.world.View
    if (!w) return []
    return d.components
      .filter((c) => c.observable)
      .map((c) => {
        const v = w.get(d.id, c.key)
        return { key: c.key, label: c.label, value: v, on: v === true || v === 1 || v === 'on' }
      })
  }

  function acceptanceView(): { spec: AcceptSpec; met: boolean }[] {
    version.value
    const c = controller.value
    if (!c) return []
    return c.wo.acceptance.map((spec) => ({
      spec,
      met: c.world.get(spec.device, spec.comp) === spec.equals
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
    acceptanceView
  }
})
