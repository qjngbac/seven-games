<script setup lang="ts">
import { computed } from "vue";
import { useGame } from "../stores/game";

const game = useGame();
const info = computed(() => game.endingInfo);
const stats = computed(() => {
  const g = game.game!;
  return {
    day: g.day,
    choices: g.choiceLog.length,
    tags: g.tags.length,
  };
});
</script>

<template>
  <div class="card center ending" v-if="info && game.game">
    <div class="ekind" :class="info.kind">{{ info.kind === "win" ? "🎉 通关" : "💀 结局" }}</div>
    <h2 class="etitle">{{ info.title }}</h2>
    <p class="etext">{{ info.text }}</p>
    <div class="honor">称号：{{ info.honor }}</div>

    <div class="stats">
      <div><b>{{ stats.day }}</b><span>进行到第几天</span></div>
      <div><b>{{ stats.choices }}</b><span>做出选择</span></div>
      <div><b>{{ stats.tags }}</b><span>获得标签</span></div>
    </div>

    <div class="row" style="justify-content: center; margin-top: 18px">
      <button class="btn" @click="game.newGame()">再玩一次</button>
      <button class="btn ghost" @click="game.restart()">回主菜单</button>
    </div>
  </div>
</template>

<style scoped>
.ekind {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 1px;
}
.ekind.win {
  color: var(--good);
}
.ekind.lose {
  color: var(--crit);
}
.etitle {
  font-size: 26px;
  margin: 6px 0;
}
.etext {
  line-height: 1.7;
  color: #3a3a3a;
}
.honor {
  display: inline-block;
  margin-top: 10px;
  background: #fff8ef;
  border: 1px dashed var(--warn);
  border-radius: 20px;
  padding: 8px 16px;
  font-weight: 700;
}
.stats {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 18px;
}
.stats div {
  display: flex;
  flex-direction: column;
}
.stats b {
  font-size: 26px;
  color: var(--accent);
}
.stats span {
  font-size: 12px;
  color: var(--muted);
}
</style>
