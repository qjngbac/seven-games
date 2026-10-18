<script setup lang="ts">
import { ref, computed } from "vue";
import { useGame } from "../game/store";

const emit = defineEmits<{ (e: "close"): void }>();
const game = useGame();

const keyword = ref("");

const filteredRecords = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return game.history;
  return game.history.filter(
    (r) =>
      r.puzzleTitle.toLowerCase().includes(kw) ||
      r.chapterTitle.toLowerCase().includes(kw) ||
      r.timestamp.includes(kw)
  );
});

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function handleClear() {
  if (confirm("确定要清空所有推理历史记录吗？（不影响已通关进度）")) {
    game.clearAllHistory();
  }
}
</script>

<template>
  <div class="modal-mask" @click.self="emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h2>📜 推理历史档案</h2>
        <button class="btn small ghost" @click="emit('close')">✕ 关闭</button>
      </div>

      <div class="stats-bar">
        <div class="stat-pill">
          <span class="stat-lbl">已存档案</span>
          <span class="stat-val">{{ game.history.length }} 份</span>
        </div>
        <div class="stat-pill">
          <span class="stat-lbl">通关关卡</span>
          <span class="stat-val">{{ game.progress.completed.length }} / {{ game.totalPuzzles }}</span>
        </div>
        <div class="stat-pill">
          <span class="stat-lbl">历史最高单关</span>
          <span class="stat-val">{{ Object.values(game.progress.bestScore).reduce((a, b) => Math.max(a, b), 0) }} 分</span>
        </div>
      </div>

      <div class="toolbar">
        <input
          v-model="keyword"
          type="text"
          placeholder="搜索关卡或章节..."
          class="search-input"
        />
        <button
          v-if="game.history.length > 0"
          class="btn small ghost text-danger"
          @click="handleClear"
        >
          🗑️ 清空历史
        </button>
      </div>

      <div class="record-list">
        <div v-if="filteredRecords.length === 0" class="empty-state">
          <p class="muted">
            {{ game.history.length === 0 ? "暂无推理历史记录，通关关卡后将自动归档。" : "未找到匹配的推理记录。" }}
          </p>
        </div>

        <div
          v-for="item in filteredRecords"
          :key="item.id"
          class="history-row"
        >
          <div class="history-main">
            <div class="history-title-row">
              <span class="history-badge">{{ item.chapterTitle || "推理关卡" }}</span>
              <strong class="history-name">{{ item.puzzleTitle }}</strong>
              <span class="history-stars">{{ "★".repeat(item.stars) }}{{ "☆".repeat(3 - item.stars) }}</span>
            </div>
            <div class="history-meta">
              <span>⏱️ 用时 {{ fmtTime(item.timeMs) }}</span>
              <span>💡 提示 {{ item.hintsUsed }} 次</span>
              <span>⚠️ 错误 {{ item.errors }} 次</span>
              <span class="history-time">{{ item.timestamp }}</span>
            </div>
          </div>
          <div class="history-score">
            <span class="score-num">+{{ item.score }}</span>
            <span class="score-unit">分</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  padding: 16px;
}

.modal-card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  width: 100%;
  max-width: 680px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line);
}
.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text);
}

.stats-bar {
  display: flex;
  gap: 12px;
  padding: 12px 20px;
  background: var(--bg-soft);
  border-bottom: 1px solid var(--line);
}
.stat-pill {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 8px;
  background: var(--panel);
  border-radius: 8px;
  border: 1px solid var(--line);
}
.stat-lbl {
  font-size: 0.75rem;
  color: var(--text-dim);
}
.stat-val {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--accent);
  margin-top: 2px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--line);
}
.search-input {
  flex: 1;
  background: var(--bg-soft);
  border: 1px solid var(--line);
  color: var(--text);
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.9rem;
}
.search-input:focus {
  outline: none;
  border-color: var(--accent-2);
}
.text-danger {
  color: var(--bad);
}
.text-danger:hover {
  border-color: var(--bad);
}

.record-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
}

.history-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-soft);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 14px;
  transition: border-color 0.15s;
}
.history-row:hover {
  border-color: var(--accent-2);
}

.history-main {
  flex: 1;
  min-width: 0;
}
.history-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.history-badge {
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--panel-2);
  color: var(--accent-2);
}
.history-name {
  font-size: 0.95rem;
  color: var(--text);
}
.history-stars {
  color: var(--accent);
  font-size: 0.9rem;
  letter-spacing: 2px;
}

.history-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 0.8rem;
  color: var(--text-dim);
}
.history-time {
  margin-left: auto;
  opacity: 0.8;
}

.history-score {
  margin-left: 16px;
  text-align: right;
  white-space: nowrap;
}
.score-num {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--good);
}
.score-unit {
  font-size: 0.75rem;
  color: var(--text-dim);
  margin-left: 2px;
}
</style>
