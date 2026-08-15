<script setup lang="ts">
import { computed } from "vue";
import { useGame } from "../game/store";

const game = useGame();
const res = computed(() => game.lastResult!);
const puzzle = computed(() => game.puzzle!);
const fmtTime = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
</script>

<template>
  <div>
    <div class="topbar">
      <h1 style="font-size: 1.1rem">🎉 推理成功</h1>
      <span style="width: 64px"></span>
    </div>

    <div class="card center">
      <div class="stars">★{{ "★".repeat(res.stars) }}{{ "☆".repeat(3 - res.stars) }}</div>
      <div style="font-size: 2rem; font-weight: 800; margin: 6px 0">{{ res.score }} 分</div>
      <div class="muted">
        用时 {{ fmtTime(res.timeMs) }} · 提示 {{ res.hintsUsed }} 次 · 错误 {{ res.errors }} 次
      </div>
    </div>

    <div class="card">
      <div style="font-weight: 700; margin-bottom: 8px">🔍 唯一解 · 身份分配</div>
      <div v-for="c in puzzle.characters" :key="c.id" class="char-card">
        <div class="char-avatar">{{ c.name.slice(0, 1) }}</div>
        <div class="grow" style="font-weight: 700">{{ c.name }}</div>
        <span class="chip" :class="'role-' + res.solution[c.id]">
          {{ puzzle.roleLabels?.[res.solution[c.id]] ?? res.solution[c.id] }}
        </span>
      </div>
    </div>

    <div class="card">
      <div style="font-weight: 700; margin-bottom: 8px">🧩 最短推理链</div>
      <ol style="margin: 0; padding-left: 22px; line-height: 1.8">
        <li v-for="(step, i) in res.reasoningChain" :key="i">{{ step }}</li>
      </ol>
    </div>

    <div class="row" style="justify-content: center">
      <button class="btn primary" @click="game.nextPuzzle()">下一关 ▶</button>
      <button class="btn ghost" @click="game.openChapters()">章节</button>
      <button class="btn ghost" @click="game.goMenu()">菜单</button>
    </div>
  </div>
</template>
