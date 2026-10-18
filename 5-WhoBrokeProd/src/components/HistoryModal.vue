<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGame, CASES } from '../store'

const emit = defineEmits<{ (e: 'close'): void }>()
const game = useGame()

const keyword = ref('')

const filteredRecords = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return game.history
  return game.history.filter(
    (r) =>
      r.caseTitle.toLowerCase().includes(kw) ||
      `第${r.chapter}章`.includes(kw) ||
      r.accusedActors.some((a) => a.toLowerCase().includes(kw)) ||
      r.timestamp.includes(kw)
  )
})

function outcomeLabel(o: 'success' | 'partial' | 'fail'): string {
  if (o === 'success') return '✓ 成功破案'
  if (o === 'partial') return '⚠️ 部分成立'
  return '✕ 指控失败'
}

function handleClear() {
  if (confirm('确定要清空所有案件调查历史记录吗？（已破案进度与声誉将保留）')) {
    game.clearAllHistory()
  }
}
</script>

<template>
  <div class="modal-mask" @click.self="emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h2 style="margin: 0; font-size: 1.25rem">📜 调查历史档案</h2>
        <button class="btn-ghost" @click="emit('close')">✕ 关闭</button>
      </div>

      <div class="stats-bar">
        <div class="stat-pill">
          <span class="stat-lbl">调查卷宗</span>
          <span class="stat-val">{{ game.history.length }} 份</span>
        </div>
        <div class="stat-pill">
          <span class="stat-lbl">已破案件</span>
          <span class="stat-val">{{ game.solvedCases.length }} / {{ CASES.length }}</span>
        </div>
        <div class="stat-pill">
          <span class="stat-lbl">当前声誉</span>
          <span class="stat-val" :style="{ color: game.reputation >= 0 ? 'var(--good, #4cd964)' : 'var(--danger, #ff6b6b)' }">
            {{ game.reputation }}
          </span>
        </div>
      </div>

      <div class="toolbar">
        <input
          v-model="keyword"
          type="text"
          placeholder="搜索案件、嫌疑人或章节..."
          class="search-input"
        />
        <button
          v-if="game.history.length > 0"
          class="btn-ghost text-danger"
          @click="handleClear"
        >
          🗑️ 清空历史
        </button>
      </div>

      <div class="record-list">
        <div v-if="filteredRecords.length === 0" class="empty-state">
          <p class="muted">
            {{ game.history.length === 0 ? '暂无案件调查记录，完成指控裁决后将自动归档。' : '未找到匹配的案件记录。' }}
          </p>
        </div>

        <div
          v-for="item in filteredRecords"
          :key="item.id"
          class="history-row"
        >
          <div class="history-main">
            <div class="history-title-row">
              <span class="history-badge">第 {{ item.chapter }} 章</span>
              <strong class="history-name">{{ item.caseTitle }}</strong>
              <span
                class="chip"
                :class="{
                  ok: item.outcome === 'success',
                  warn: item.outcome === 'partial',
                  danger: item.outcome === 'fail'
                }"
                style="margin-left: 6px"
              >
                {{ outcomeLabel(item.outcome) }}
              </span>
            </div>
            <div class="history-meta">
              <span>🎯 指控：{{ item.accusedActors.join('、') || '未指控具体人员' }}</span>
              <span>⏱️ 消耗 {{ item.actionsUsed }}/{{ item.maxActions }} 行动点</span>
              <span class="history-time">{{ item.timestamp }}</span>
            </div>
            <div v-if="item.reason" class="reason-note">
              {{ item.reason }}
            </div>
          </div>
          <div class="history-score">
            <span
              class="score-num"
              :class="{
                'text-good': item.reputationChange > 0,
                'text-bad': item.reputationChange < 0
              }"
            >
              {{ item.reputationChange > 0 ? `+${item.reputationChange}` : item.reputationChange }}
            </span>
            <span class="score-unit">声誉</span>
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
  background: var(--panel, #1e2538);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
  border-radius: 12px;
  width: 100%;
  max-width: 720px;
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
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.12));
}

.stats-bar {
  display: flex;
  gap: 12px;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.12));
}
.stat-pill {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 8px;
  background: var(--panel, #1e2538);
  border-radius: 8px;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.stat-lbl {
  font-size: 0.75rem;
  color: var(--text-dim, #8b9bb4);
}
.stat-val {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--accent, #ffd166);
  margin-top: 2px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.12));
}
.search-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
  color: var(--text, #fff);
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.9rem;
}
.search-input:focus {
  outline: none;
  border-color: var(--accent, #ffd166);
}
.text-danger {
  color: #ff6b6b;
}

.record-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
}

.history-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  border-radius: 10px;
  padding: 12px 14px;
}
.history-row:hover {
  border-color: var(--accent, #ffd166);
}

.history-main {
  flex: 1;
  min-width: 0;
}
.history-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 6px;
}
.history-badge {
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--accent, #ffd166);
}
.history-name {
  font-size: 0.95rem;
  color: var(--text, #fff);
}

.history-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 0.8rem;
  color: var(--text-dim, #8b9bb4);
  margin-bottom: 4px;
}
.history-time {
  margin-left: auto;
  opacity: 0.8;
}

.reason-note {
  font-size: 0.82rem;
  color: var(--text-dim, #8b9bb4);
  line-height: 1.4;
  margin-top: 4px;
  border-left: 2px solid rgba(255, 255, 255, 0.15);
  padding-left: 8px;
}

.history-score {
  margin-left: 16px;
  text-align: right;
  white-space: nowrap;
}
.score-num {
  font-size: 1.25rem;
  font-weight: 800;
}
.text-good {
  color: #4cd964;
}
.text-bad {
  color: #ff6b6b;
}
.score-unit {
  font-size: 0.75rem;
  color: var(--text-dim, #8b9bb4);
  margin-left: 2px;
}

.chip.warn {
  background: rgba(255, 180, 84, 0.2);
  color: #ffb454;
  border: 1px solid rgba(255, 180, 84, 0.4);
}
.chip.danger {
  background: rgba(255, 107, 107, 0.2);
  color: #ff6b6b;
  border: 1px solid rgba(255, 107, 107, 0.4);
}
</style>
