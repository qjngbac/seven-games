<script setup lang="ts">
import { useGame } from "../game/store";
import type { Chapter } from "../puzzle/repository";

const game = useGame();

function goLobby(): void {
  window.location.href = "../../index.html";
}

function getCompletedCount(ch: Chapter): number {
  return ch.puzzleIds.filter((pid) => game.progress.completed.includes(pid)).length;
}
</script>

<template>
  <div class="chapter-select-wrap">
    <div class="topbar">
      <button class="btn small ghost" @click="game.goMenu()">← 菜单</button>
      <h1 style="font-size: 1.15rem; margin: 0">选择章节与关卡</h1>
      <button class="btn small ghost" @click="goLobby()" title="返回七款小游戏大厅">🏠 游戏大厅</button>
    </div>

    <div class="chapter-grid">
      <div
        v-for="ch in game.chapters"
        :key="ch.id"
        class="chapter-card-box"
      >
        <div class="chapter-header">
          <div class="chapter-title">{{ ch.title }}</div>
          <span
            class="chip"
            :class="{ 'chip-done': getCompletedCount(ch) === ch.puzzleIds.length }"
          >
            {{ getCompletedCount(ch) }}/{{ ch.puzzleIds.length }} 关
          </span>
        </div>

        <div class="chapter-desc">{{ ch.mechanic.replace(/。+$/, "") }}</div>

        <div class="levels-row">
          <button
            v-for="(pid, i) in ch.puzzleIds"
            :key="pid"
            class="lvl-btn"
            :class="{ done: game.progress.completed.includes(pid) }"
            :title="'第 ' + (i + 1) + ' 关' + (game.progress.bestScore[pid] ? ' · 最佳: ' + game.progress.bestScore[pid] + '分' : '')"
            @click="game.startPuzzle(pid)"
          >
            <div class="lvl-name">第 {{ i + 1 }} 关</div>
            <div class="lvl-status">
              <span v-if="game.progress.stars[pid]" class="stars-text">
                {{ "★".repeat(game.progress.stars[pid]) }}
              </span>
              <span v-else class="unplayed-text">挑战</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chapter-select-wrap {
  width: 100%;
}
.chapter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 12px;
}
.chapter-card-box {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 14px;
  display: flex;
  flex-direction: column;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.chapter-card-box:hover {
  border-color: var(--accent-2);
}
.chapter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.chapter-title {
  font-weight: 700;
  font-size: 1rem;
  color: var(--text);
}
.chip-done {
  border-color: var(--accent) !important;
  color: var(--accent) !important;
}
.chapter-desc {
  color: var(--text-dim);
  font-size: 0.82rem;
  line-height: 1.45;
  margin-bottom: 12px;
  flex-grow: 1;
}
.levels-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-top: auto;
}
.lvl-btn {
  background: var(--bg-soft);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 7px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text);
  transition: transform 0.08s ease, border-color 0.15s ease, background 0.15s ease;
}
.lvl-btn:hover {
  border-color: var(--accent);
  background: var(--panel-2);
  transform: translateY(-2px);
}
.lvl-btn:active {
  transform: translateY(0);
}
.lvl-btn.done {
  border-color: rgba(255, 209, 102, 0.45);
}
.lvl-name {
  font-size: 0.76rem;
  font-weight: 600;
  white-space: nowrap;
}
.lvl-status {
  font-size: 0.72rem;
  margin-top: 2px;
  height: 16px;
  display: flex;
  align-items: center;
}
.stars-text {
  color: var(--accent);
  font-size: 0.8rem;
  letter-spacing: 1px;
}
.unplayed-text {
  color: var(--text-dim);
  font-size: 0.72rem;
}
</style>
