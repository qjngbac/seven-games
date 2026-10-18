<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGame } from '../store'
import HistoryModal from './HistoryModal.vue'

const game = useGame()
const showHistory = ref(false)
const dr = computed(() => game.dayResults[game.dayResults.length - 1])
</script>

<template>
  <div class="center-screen scroll" style="align-items: stretch; max-width: 680px; margin: 0 auto">
    <div class="card" style="text-align: left">
      <h2>📊 {{ game.currentScene?.name }} · 第 {{ dr?.date }} 天 · 日结</h2>

      <div class="grid">
        <div class="stat"><span class="muted">处理人数</span><b>{{ dr?.processed }}</b></div>
        <div class="stat"><span class="muted">合法裁定</span><b style="color: var(--ok)">{{ dr?.correct }}</b></div>
        <div class="stat"><span class="muted">错误放行</span><b style="color: var(--danger)">{{ dr?.wrongAllow }}</b></div>
        <div class="stat"><span class="muted">错误拒绝</span><b style="color: var(--danger)">{{ dr?.wrongDeny }}</b></div>
        <div class="stat"><span class="muted">暂扣</span><b>{{ dr?.detainCount }}</b></div>
        <div class="stat"><span class="muted">准确率</span><b>{{ Math.round((dr?.accuracy ?? 0) * 100) }}%</b></div>
        <div class="stat"><span class="muted">工资</span><b style="color: var(--ok)">+{{ dr?.salary }}</b></div>
        <div class="stat"><span class="muted">罚款</span><b style="color: var(--danger)">-{{ dr?.penalty }}</b></div>
        <div class="stat"><span class="muted">净收入</span><b>{{ dr?.net >= 0 ? '+' : '' }}{{ dr?.net }}</b></div>
      </div>

      <p class="muted" style="margin: 14px 0 4px">📨 今天的后续消息：</p>
      <ul style="margin: 0; padding-left: 18px; line-height: 1.8">
        <li v-for="(e, i) in dr?.events" :key="i">{{ e }}</li>
        <li v-if="!dr?.events?.length" class="muted">今天风平浪静，没有特别的事发生。</li>
      </ul>

      <div style="display: flex; gap: 12px; margin-top: 18px">
        <button class="btn-sm" style="flex: 1; padding: 10px; font-size: 15px" @click="showHistory = true">
          📁 查阅执勤履历档案 ({{ game.history.length }})
        </button>
        <button class="btn-primary" style="flex: 2; font-size: 17px" @click="game.nextDay()">
          进入第 {{ game.dayNumber + 1 }} 天 →
        </button>
      </div>
    </div>

    <!-- 执勤档案 -->
    <HistoryModal v-if="showHistory" @close="showHistory = false" />
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 14px 0;
}
.stat {
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stat b {
  font-size: 22px;
}
</style>
