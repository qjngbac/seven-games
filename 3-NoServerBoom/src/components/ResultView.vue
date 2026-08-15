<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../store'
import { DEVICE_BY_ID } from '../data/devices'

const store = useGameStore()
const r = computed(() => store.result)

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

function devStatusAt(snapshot: Record<string, unknown> | undefined, deviceId: string) {
  if (!snapshot) return []
  const d = DEVICE_BY_ID[deviceId]
  if (!d) return []
  return d.components
    .filter((c) => c.observable)
    .map((c) => {
      const v = snapshot[`${deviceId}.${c.key}`]
      const on = v === true || v === 1 || v === 'on'
      const dot = on ? (badWhenTrue.has(c.key) ? 'dot err' : 'dot on') : badWhenTrue.has(c.key) ? 'dot on' : 'dot off'
      return { label: c.label, value: on ? '是' : '否', dot }
    })
}
</script>

<template>
  <div v-if="r" class="panel">
    <div class="spread">
      <div>
        <div class="grade" :class="r.grade">{{ r.grade }}</div>
        <div class="muted" style="font-size: 13px">{{ r.title }} · 得分 {{ r.score }}</div>
      </div>
      <div style="text-align: right; font-size: 13px">
        <div>用时 {{ r.timeUsed }} / {{ r.timeBudget }} 步</div>
        <div>满意度 {{ r.satisfaction }}</div>
        <div :style="{ color: r.rootCauseFixed ? 'var(--ok)' : 'var(--warn)' }">
          根因 {{ r.rootCauseFixed ? '已消除' : '未消除' }}
        </div>
      </div>
    </div>

    <div v-if="r.funny" style="margin: 12px 0; font-size: 13px; color: var(--accent)">
      😆 {{ r.funny }}
    </div>

    <div class="row" style="margin-bottom: 12px">
      <span class="tag">损失 {{ r.damageCount }}</span>
      <span class="tag risk">高危操作 {{ r.riskyCount }}</span>
      <span class="tag">离谱度 {{ r.absurdCount }}</span>
      <span v-if="r.deviation" class="tag risk">偏离流程</span>
    </div>

    <div v-if="r.deviation" class="muted" style="font-size: 13px; margin-bottom: 12px">
      复盘提示：{{ r.deviation }}
    </div>

    <h3>操作时间线（可复盘）</h3>
    <div class="log" style="max-height: 320px">
      <div v-for="(e, i) in r.timeline" :key="i" style="border-bottom: 1px solid #141b27; padding: 8px 0">
        <div style="font-weight: 700">
          第 {{ e.step }} 步 · {{ e.actionName }}
          <span v-if="e.target" class="muted">@ {{ e.target }}</span>
          <span v-if="e.risk" class="tag risk" style="margin-left: 6px">风险{{ e.risk }}</span>
          <span v-if="e.damage" class="tag risk" style="margin-left: 4px">损失{{ e.damage }}</span>
        </div>
        <div class="muted" style="font-size: 12px">{{ e.log }}</div>
        <div style="margin-top: 5px">
          <span v-for="d in store.wo?.devices ?? []" :key="d" style="margin-right: 10px">
            <span v-for="c in devStatusAt(e.stateAfter, d)" :key="c.label" class="chip">
              <span :class="c.dot" />{{ c.label }}:{{ c.value }}
            </span>
          </span>
        </div>
      </div>
      <div v-if="!r.timeline.length" class="muted">未执行任何操作即提交。</div>
    </div>

    <div class="row" style="margin-top: 14px; justify-content: flex-end">
      <button class="ghost" @click="store.backToList()">返回工单列表</button>
      <button class="primary" @click="store.retry()">重做本单</button>
    </div>
  </div>
</template>
