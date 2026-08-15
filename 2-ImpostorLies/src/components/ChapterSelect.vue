<script setup lang="ts">
import { useGame } from "../game/store";

const game = useGame();
</script>

<template>
  <div>
    <div class="topbar">
      <button class="btn small ghost" @click="game.goMenu()">← 菜单</button>
      <h1 style="font-size: 1.1rem">选择章节</h1>
      <span style="width: 64px"></span>
    </div>

    <div
      v-for="ch in game.chapters"
      :key="ch.id"
      class="chapter-card"
      :class="{ sel: game.selectedChapterId === ch.id }"
      @click="game.selectChapter(ch.id)"
    >
      <div style="font-weight: 700">{{ ch.title }}</div>
      <div class="muted" style="font-size: 0.85rem; margin: 4px 0">{{ ch.mechanic }}</div>
      <div class="row" style="gap: 6px">
        <span
          v-for="pid in ch.puzzleIds"
          :key="pid"
          class="chip"
          :style="game.progress.stars[pid] ? 'border-color: var(--accent)' : ''"
        >
          {{ game.progress.completed.includes(pid) ? "★".repeat(game.progress.stars[pid] || 1) : "○" }}
        </span>
      </div>
    </div>

    <div class="card" v-if="game.currentChapter">
      <div style="font-weight: 700; margin-bottom: 8px">{{ game.currentChapter.title }} · 关卡</div>
      <div
        v-for="(pid, i) in game.currentChapter.puzzleIds"
        :key="pid"
        class="puzzle-item"
        @click="game.startPuzzle(pid)"
      >
        <span>第 {{ i + 1 }} 关
          <span class="muted" style="font-size: 0.8rem">（最佳 {{ game.progress.bestScore[pid] ?? "—" }} 分）</span>
        </span>
        <span class="stars" v-if="game.progress.stars[pid]">★{{ "★".repeat(game.progress.stars[pid] - 1) }}</span>
        <span v-else class="chip">未通关</span>
      </div>
    </div>
  </div>
</template>
