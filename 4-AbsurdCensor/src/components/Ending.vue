<script setup lang="ts">
import { computed } from 'vue'
import { useGame } from '../store'

const game = useGame()
const ending = computed(() => game.ending)
const totals = computed(() => {
  const drs = game.dayResults
  const correct = drs.reduce((s, d) => s + d.correct, 0)
  const wrong = drs.reduce((s, d) => s + d.wrongAllow + d.wrongDeny, 0)
  const processed = drs.reduce((s, d) => s + d.processed, 0)
  return { correct, wrong, processed, salary: game.totalSalary }
})
</script>

<template>
  <div class="center-screen scroll" style="align-items: stretch; max-width: 680px; margin: 0 auto">
    <div class="card" style="text-align: center">
      <div style="font-size: 56px">
        {{ ending?.kind === 'catnation' ? '🐱' : ending?.kind === 'fired' ? '📭' : ending?.kind === 'rebel' ? '🚪' : ending?.kind === 'diplomat' ? '🕴️' : '🏛️' }}
      </div>
      <h1 style="font-size: 30px">{{ ending?.title }}</h1>
      <p class="muted" style="margin-top: 4px">场景：{{ game.currentScene?.icon }} {{ game.currentScene?.name }}</p>
      <p class="subtitle" style="text-align: center; margin: 14px auto">{{ ending?.text }}</p>

      <div class="grid" style="text-align: left; margin-top: 18px">
        <div class="stat"><span class="muted">总处理</span><b>{{ totals.processed }}</b></div>
        <div class="stat"><span class="muted">合法裁定</span><b style="color: var(--ok)">{{ totals.correct }}</b></div>
        <div class="stat"><span class="muted">错误</span><b style="color: var(--danger)">{{ totals.wrong }}</b></div>
        <div class="stat"><span class="muted">累计良心</span><b :style="{ color: game.cum.conscience >= 0 ? 'var(--ok)' : 'var(--danger)' }">{{ game.cum.conscience >= 0 ? '+' : '' }}{{ game.cum.conscience }}</b></div>
        <div class="stat"><span class="muted">组织压力</span><b>{{ game.cum.orgPressure }}</b></div>
        <div class="stat"><span class="muted">总积蓄</span><b>{{ totals.salary >= 0 ? '+' : '' }}{{ totals.salary }}</b></div>
      </div>

      <button class="btn-primary" style="margin-top: 20px; width: 100%; font-size: 17px" @click="game.toMenu()">
        回到主菜单
      </button>
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
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
  font-size: 20px;
}
</style>
