<script setup lang="ts">
import { useGame } from '../game/store';
const g = useGame();
</script>

<template>
  <div class="row spread">
    <button class="btn-ghost" @click="g.goMenu()">← 返回</button>
    <strong>选择关卡</strong>
    <button class="btn-ghost" @click="g.screen = 'SETTINGS'">⚙️</button>
  </div>

  <div v-for="grp in g.chapterGroups" :key="grp.chapter" class="card">
    <div class="subtitle" style="font-weight: 700; margin-bottom: 10px">{{ grp.title }}</div>
    <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))">
      <button
        v-for="lv in grp.levels"
        :key="lv.id"
        class="card"
        style="text-align: left; display: flex; flex-direction: column; gap: 6px"
        @click="g.openBriefing(lv.id)"
      >
        <div style="font-weight: 700">{{ lv.title.split(' · ')[1] ?? lv.title }}</div>
        <div class="subtitle" style="font-size: 0.82rem">{{ lv.goalText }}</div>
        <div class="row" style="margin-top: auto">
          <span v-if="g.progress.completed.includes(lv.id)">
            <span v-for="n in 3" :key="n" :style="{ color: n <= (g.progress.stars[lv.id] || 0) ? 'var(--tmp)' : 'var(--line)' }">★</span>
            <span class="chip" style="margin-left: 6px">已通关</span>
          </span>
          <span v-else class="chip">未通关</span>
          <span class="chip">最佳 {{ g.progress.best[lv.id] || 0 }}</span>
        </div>
      </button>
    </div>
  </div>
</template>
