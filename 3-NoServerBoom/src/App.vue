<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from './store'
import WorkOrderList from './components/WorkOrderList.vue'
import Briefing from './components/Briefing.vue'
import SiteView from './components/SiteView.vue'
import ResultView from './components/ResultView.vue'
import HistoryModal from './components/HistoryModal.vue'

const store = useGameStore()
const showHistory = ref(false)

function goLobby(): void {
  window.location.href = '../../index.html'
}
</script>

<template>
  <header class="spread" style="margin-bottom: 14px">
    <div>
      <h1 style="font-size: 22px">🔧 今天别把机房炸了</h1>
      <div class="muted" style="font-size: 13px">错误操作模拟器 · 观察 → 假设 → 低风险验证 → 修复 → 验收</div>
    </div>
    <div class="row" style="gap: 8px">
      <button class="ghost" @click="showHistory = true" title="查阅工单排障历史">📜 维修历史</button>
      <button class="ghost" @click="goLobby()" title="返回七款小游戏大厅">🏠 游戏大厅</button>
      <button v-if="store.screen !== 'list'" class="ghost" @click="store.backToList()">← 工单列表</button>
    </div>
  </header>

  <WorkOrderList v-if="store.screen === 'list'" />
  <Briefing v-else-if="store.screen === 'briefing'" />
  <SiteView v-else-if="store.screen === 'site'" />
  <ResultView v-else-if="store.screen === 'result'" />

  <!-- 维修工单历史弹窗 -->
  <HistoryModal v-if="showHistory" @close="showHistory = false" />
</template>
