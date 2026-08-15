<script setup lang="ts">
import { useGame } from "../stores/game";
const game = useGame();
</script>

<template>
  <div class="card center">
    <div class="subtitle">DAY</div>
    <div class="daynum">{{ game.game!.day }} / {{ game.game!.maxDays }}</div>
    <div class="subtitle">今天要处理 {{ game.game!.eventsPerDay }} 个事件</div>

    <div class="due" v-if="game.dueNotes.length">
      <div class="due-h">📨 后续事件生效</div>
      <div class="due-item" v-for="(n, i) in game.dueNotes" :key="i">{{ n }}</div>
    </div>

    <div class="row" style="justify-content: center; margin-top: 16px">
      <button class="btn" @click="game.drawEvent()">开始处理</button>
      <button class="btn ghost" @click="game.quitToMenu()">退出到主菜单</button>
    </div>
  </div>
</template>

<style scoped>
.daynum {
  font-size: 40px;
  font-weight: 900;
  color: var(--accent);
  line-height: 1.1;
}
.due {
  margin-top: 16px;
  background: #fff8ef;
  border: 1px dashed var(--warn);
  border-radius: 12px;
  padding: 12px;
  text-align: left;
}
.due-h {
  font-weight: 700;
  margin-bottom: 6px;
}
.due-item {
  font-size: 13px;
  color: var(--ink);
  padding: 3px 0;
}
</style>
