<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../store'

const store = useGameStore()

// 章节从工单数据推导，避免新增章节后遗漏 UI 入口
const chapters = computed(() =>
  [...new Set(store.workOrders.map((w) => w.chapter))].sort((a, b) => a - b)
)
function byChapter(ch: number) {
  return store.workOrders.filter((w) => w.chapter === ch)
}
</script>

<template>
  <div>
    <p class="muted" style="margin-top: 0">
      选择一张工单开始。每单都是一次机房排障：先看清症状，别急着恢复出厂。
    </p>
    <div v-for="ch in chapters" :key="ch" class="panel" style="margin-bottom: 14px">
      <h3 style="color: var(--accent-2)">第 {{ ch }} 章</h3>
      <div class="row">
        <button
          v-for="wo in byChapter(ch)"
          :key="wo.id"
          class="device"
          style="text-align: left; cursor: pointer"
          @click="store.openWorkOrder(wo.id)"
        >
          <div style="font-size: 16px; font-weight: 700">{{ wo.title }}</div>
          <div class="muted" style="font-size: 12px; margin-top: 4px">{{ wo.scene }}</div>
          <div style="font-size: 12px; margin-top: 8px">
            <span class="tag" :class="wo.customerAccurate ? 'rev' : 'risk'">
              {{ wo.customerAccurate ? '描述可信' : '描述存疑' }}
            </span>
            <span class="tag" style="margin-left: 6px">限时 {{ wo.constraints.timeBudget }} 步</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
