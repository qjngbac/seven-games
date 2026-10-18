<script setup lang="ts">
import { ref } from 'vue'
import { useGame } from '../store'
import { SCENES } from '../data/scenes'
import HistoryModal from './HistoryModal.vue'

const game = useGame()
const showHistory = ref(false)

const totalDays = SCENES.reduce((s, sc) => s + sc.days.length, 0)

function goLobby(): void {
  window.location.href = '../../index.html'
}
</script>

<template>
  <div class="center-screen scroll" style="align-items: stretch; max-width: 880px; margin: 0 auto">
    <div style="text-align: center">
      <div style="font-size: 56px">🏛️</div>
      <h1>荒诞审查局 · 多场景版</h1>
      <p class="subtitle">
        你是各路关卡窗口的审查员。规则天天变，每个人带着故事。<br />
        对照证件、政策和那句口头陈述，在「放行 / 拒绝 / 暂扣」之间盖章。
      </p>

      <div style="margin: 10px 0; display: flex; justify-content: center; gap: 10px; flex-wrap: wrap">
        <button class="btn-sm" style="font-size: 14px; padding: 7px 16px" @click="showHistory = true">
          📁 查阅执勤历史档案 (已收录 {{ game.history.length }} 份卷宗)
        </button>
        <button class="btn-sm" style="font-size: 14px; padding: 7px 16px" @click="goLobby()">
          🏠 游戏大厅
        </button>
      </div>
    </div>

    <p class="muted" style="margin: 10px 0 6px; text-align: center">
      选择一个审查场景开始（共 {{ SCENES.length }} 个场景 · {{ totalDays }} 个工作日）
    </p>

    <div class="scene-grid">
      <div v-for="sc in SCENES" :key="sc.id" class="scene-card card">
        <div style="font-size: 42px">{{ sc.icon }}</div>
        <h2 style="margin: 6px 0 2px">{{ sc.name }}</h2>
        <p class="muted" style="font-size: 13px; min-height: 38px; margin: 0 0 8px">{{ sc.blurb }}</p>
        <p class="intro">{{ sc.intro }}</p>
        <div class="muted" style="font-size: 12px; margin: 8px 0; display: flex; justify-content: space-between; align-items: center">
          <span>{{ sc.days.length }} 个工作日</span>
          <span
            v-if="game.savedProgress.completedScenes.includes(sc.id)"
            style="color: var(--ok); font-weight: 700"
          >
            ✓ 已通关
          </span>
          <span
            v-else-if="game.savedProgress.sceneDays[sc.id]"
            style="color: var(--accent)"
          >
            进行至第 {{ game.savedProgress.sceneDays[sc.id] }} 天
          </span>
        </div>
        <button class="btn-primary" style="width: 100%" @click="game.startGame(sc.id)">
          进入{{ sc.name }} →
        </button>
      </div>
    </div>

    <p class="muted" style="font-size: 13px; margin-top: 14px; text-align: center">
      键盘：方向键切文档，A 放行 / D 拒绝 / S 暂扣
    </p>

    <!-- 执勤档案 -->
    <HistoryModal v-if="showHistory" @close="showHistory = false" />
  </div>
</template>

<style scoped>
.scene-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 14px;
  margin-top: 6px;
}
.scene-card {
  display: flex;
  flex-direction: column;
  text-align: center;
  padding: 16px 14px;
  transition: transform 0.12s, box-shadow 0.12s;
}
.scene-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.25);
}
.intro {
  font-size: 12px;
  line-height: 1.6;
  color: var(--ink-dim);
  text-align: left;
  flex: 1;
}
</style>
