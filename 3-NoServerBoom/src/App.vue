<script setup lang="ts">
import { useGameStore } from './store'
import WorkOrderList from './components/WorkOrderList.vue'
import Briefing from './components/Briefing.vue'
import SiteView from './components/SiteView.vue'
import ResultView from './components/ResultView.vue'

const store = useGameStore()
</script>

<template>
  <header class="spread" style="margin-bottom: 14px">
    <div>
      <h1 style="font-size: 22px">🔧 今天别把机房炸了</h1>
      <div class="muted" style="font-size: 13px">错误操作模拟器 · 观察 → 假设 → 低风险验证 → 修复 → 验收</div>
    </div>
    <button v-if="store.screen !== 'list'" class="ghost" @click="store.backToList()">← 工单列表</button>
  </header>

  <WorkOrderList v-if="store.screen === 'list'" />
  <Briefing v-else-if="store.screen === 'briefing'" />
  <SiteView v-else-if="store.screen === 'site'" />
  <ResultView v-else-if="store.screen === 'result'" />
</template>
