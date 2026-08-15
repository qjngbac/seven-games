<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../store'
import { ACTION_BY_ID } from '../data/actions'
import { DEVICE_BY_ID } from '../data/devices'
import { ActionDef } from '../game/types'
import ActionConfirm from './ActionConfirm.vue'

const store = useGameStore()

const badWhenTrue = new Set([
  'diskFull',
  'alarmActive',
  'tempHigh',
  'lockJammed',
  'paperJam',
  'lensBlocked',
  'configLost',
  'recordingsLost',
  'doorBroken'
])

function dotClass(d: { key: string; on: boolean }): string {
  if (d.on) return badWhenTrue.has(d.key) ? 'dot err' : 'dot on'
  return badWhenTrue.has(d.key) ? 'dot on' : 'dot off'
}
function valueText(on: boolean): string {
  return on ? '是' : '否'
}

const actions = computed<ActionDef[]>(() =>
  (store.wo?.availableActions ?? []).map((id) => ACTION_BY_ID[id]).filter(Boolean)
)

const catLabel: Record<string, string> = {
  inspect: '检查',
  repair: '修复',
  restart: '重启',
  risky: '高危'
}

const timePct = computed(() => {
  if (!store.timeBudget) return 0
  return Math.min(100, Math.round((store.timeUsed / store.timeBudget) * 100))
})

function onAction(a: ActionDef) {
  store.chooseAction(a.id)
}
</script>

<template>
  <div v-if="store.wo">
    <!-- HUD -->
    <div class="panel" style="margin-bottom: 12px">
      <div class="hud">
        <div style="min-width: 200px; flex: 1">
          <div class="muted" style="font-size: 12px">
            时间 {{ store.timeUsed }} / {{ store.timeBudget }} 步
          </div>
          <div class="meter"><span :style="{ width: timePct + '%' }" /></div>
        </div>
        <div>
          <span class="tag" :class="store.symptoms.length ? 'risk' : 'rev'">
            {{ store.symptoms.length ? store.symptoms.length + ' 项异常' : '无异常' }}
          </span>
        </div>
        <button class="primary" @click="store.submit()">提交工单 ✓</button>
      </div>
      <div
        v-if="store.insight"
        style="margin-top: 10px; font-size: 13px; color: var(--warn); background: #2a2310; border: 1px solid #4a3c18; border-radius: 8px; padding: 8px"
      >
        🔗 {{ store.insight }}
      </div>
    </div>

    <div class="row" style="align-items: flex-start">
      <!-- 设备拓扑 -->
      <div class="panel" style="flex: 1 1 420px">
        <h3>现场设备</h3>
        <div class="row">
          <div
            v-for="d in store.devices"
            :key="d.id"
            class="device"
            :class="{ selected: store.selectedTarget === d.id }"
            style="cursor: pointer"
            @click="store.selectTarget(d.id)"
          >
            <div style="font-weight: 700">
              {{ d.icon }} {{ d.name }}
              <span v-if="store.selectedTarget === d.id" style="color: var(--accent-2); font-size: 12px">·已选</span>
            </div>
            <div style="margin-top: 6px">
              <span v-for="c in store.compView(d)" :key="c.key" class="chip">
                <span :class="dotClass(c)" />
                {{ c.label }}:{{ valueText(c.on) }}
              </span>
            </div>
          </div>
        </div>

        <h3 style="margin-top: 14px">症状</h3>
        <div v-if="store.symptoms.length" class="log" style="max-height: 150px">
          <div v-for="(s, i) in store.symptoms" :key="i" :class="'sev-' + s.severity">
            ● [{{ s.deviceName }}] {{ s.display }}
          </div>
        </div>
        <div v-else class="muted" style="font-size: 13px">一切正常，没有可观察的异常。</div>
      </div>

      <!-- 工具栏 + 验收 + 日志 -->
      <div style="flex: 1 1 360px; display: flex; flex-direction: column; gap: 12px">
        <div class="panel">
          <h3>工具箱</h3>
          <div v-if="store.selectedTarget" class="muted" style="font-size: 12px; margin-bottom: 8px">
            当前目标：{{ DEVICE_BY_ID[store.selectedTarget]?.name }}
          </div>
          <div v-else class="muted" style="font-size: 12px; margin-bottom: 8px">
            提示：需要选设备的操作请先在左侧点选设备。
          </div>
          <div class="row">
            <button
              v-for="a in actions"
              :key="a.id"
              class="action-btn"
              :class="a.highRisk ? 'danger' : ''"
              :disabled="!store.actionableState(a).ok"
              :title="store.actionableState(a).reason"
              @click="onAction(a)"
            >
              <span>{{ a.name }}</span>
              <span class="meta">
                {{ catLabel[a.category] }} · {{ a.time }}步 ·
                <span v-if="a.risk" class="tag risk">风险{{ a.risk }}</span>
                <span v-else class="tag rev">安全</span>
                <span v-if="a.highRisk" class="tag risk">不可逆</span>
                <span v-else class="tag irr">可逆</span>
              </span>
            </button>
          </div>
          <div v-if="store.lastWarn" style="color: var(--warn); font-size: 12px; margin-top: 8px">
            ⚠ {{ store.lastWarn }}
          </div>
        </div>

        <div class="panel">
          <h3>验收检查</h3>
          <ul style="margin: 0; padding-left: 18px; font-size: 13px">
            <li v-for="(a, i) in store.acceptanceView()" :key="i" :style="{ color: a.met ? 'var(--ok)' : 'var(--muted)' }">
              {{ a.spec.device }}.{{ a.spec.comp }} = {{ a.spec.equals }}
              {{ a.met ? ' ✓' : ' …' }}
            </li>
          </ul>
        </div>

        <div class="panel">
          <h3>操作日志</h3>
          <div class="log">
            <div v-for="(l, i) in store.logLines" :key="i">{{ l }}</div>
            <div v-if="!store.logLines.length" class="muted">还没有操作。</div>
          </div>
        </div>
      </div>
    </div>

    <ActionConfirm v-if="store.pendingAction" />
  </div>
</template>
