<script setup lang="ts">
import { useGame } from "../stores/game";
import { CONTENT } from "../data";
const game = useGame();
</script>

<template>
  <div class="card">
    <div class="title-xl" style="font-size: 22px">选择你的开局特质</div>
    <div class="subtitle">特质只影响初始数值，不改变事件。随时可重开。</div>
    <div class="traits">
      <button
        v-for="t in CONTENT.traits"
        :key="t.id"
        class="trait"
        @click="game.selectTrait(t.id)"
      >
        <div class="tname">{{ t.name }}</div>
        <div class="tdesc">{{ t.desc }}</div>
      </button>
      <button class="trait ghost" @click="game.selectTrait(null)">
        <div class="tname">普通打工人</div>
        <div class="tdesc">不偏不倚，从标准数值开始。</div>
      </button>
    </div>
    <div class="row" style="margin-top: 14px">
      <button class="btn ghost" @click="game.backToMenu()">返回</button>
    </div>
  </div>
</template>

<style scoped>
.traits {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 16px;
}
.trait {
  text-align: left;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px 14px;
  transition: transform 0.08s ease, border-color 0.12s ease;
}
.trait:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
}
.tname {
  font-weight: 800;
  font-size: 15px;
}
.tdesc {
  color: var(--muted);
  font-size: 13px;
  margin-top: 4px;
}
</style>
