<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGame } from '../game/store';

const emit = defineEmits<{ (e: 'close'): void }>();
const g = useGame();

const keyword = ref('');

const filteredRecords = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return g.repairHistory;
  return g.repairHistory.filter(
    (r) =>
      r.levelTitle.toLowerCase().includes(kw) ||
      `第${r.chapter}章`.includes(kw) ||
      r.tierLabel.toLowerCase().includes(kw) ||
      r.timestamp.includes(kw)
  );
});

function tierClass(t: string): string {
  if (t === 'professional') return 'tag-pro';
  if (t === 'temporary') return 'tag-tmp';
  return 'tag-abs';
}

function handleClear() {
  if (confirm('确定要清空所有维修历史记录吗？（已通关关卡与图鉴将保留）')) {
    g.clearRepairHistory();
  }
}
</script>

<template>
  <div class="modal-mask" @click.self="emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h2 style="margin: 0; font-size: 1.25rem">📜 维修排障历史档案</h2>
        <button class="btn-ghost" @click="emit('close')">✕ 关闭</button>
      </div>

      <div class="stats-bar">
        <div class="stat-pill">
          <span class="stat-lbl">维修卷宗</span>
          <span class="stat-val">{{ g.repairHistory.length }} 份</span>
        </div>
        <div class="stat-pill">
          <span class="stat-lbl">已修通关卡</span>
          <span class="stat-val">{{ g.completedCount }} / {{ g.totalLevels }}</span>
        </div>
        <div class="stat-pill">
          <span class="stat-lbl">收集离谱图鉴</span>
          <span class="stat-val" style="color: var(--abs, #f59e0b)">{{ g.galleryCount }} 种</span>
        </div>
      </div>

      <div class="toolbar">
        <input
          v-model="keyword"
          type="text"
          placeholder="搜索关卡名称、章节或解法类型..."
          class="search-input"
        />
        <button
          v-if="g.repairHistory.length > 0"
          class="btn-ghost text-danger"
          @click="handleClear"
        >
          🗑️ 清空历史
        </button>
      </div>

      <div class="record-list">
        <div v-if="filteredRecords.length === 0" class="empty-state">
          <p class="subtitle">
            {{ g.repairHistory.length === 0 ? '暂无维修历史记录，修通关卡后将自动归档。' : '未找到匹配的维修记录。' }}
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
              <strong class="history-name">{{ item.levelTitle }}</strong>
              <span class="chip" :class="tierClass(item.tier)" style="margin-left: 6px">
                {{ item.tierLabel }}
              </span>
              <span class="history-stars">{{ '★'.repeat(item.stars) }}{{ '☆'.repeat(3 - item.stars) }}</span>
            </div>
            <div class="history-meta">
              <span>🔧 操作 {{ item.moves }} 步</span>
              <span v-if="item.errors > 0" style="color: var(--danger)">⚠️ 失败 {{ item.errors }} 次</span>
              <span v-if="item.comedy > 0" style="color: var(--abs)">🤪 搞笑分 +{{ item.comedy }}</span>
              <span class="history-time">{{ item.timestamp }}</span>
            </div>
            <div v-if="item.endingText" class="ending-note">
              {{ item.endingText }}
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
  background: var(--panel, #1e2538);
  border: 1px solid var(--line, rgba(255, 255, 255, 0.12));
  border-radius: var(--radius, 12px);
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
  border-bottom: 1px solid var(--line, rgba(255, 255, 255, 0.12));
}

.stats-bar {
  display: flex;
  gap: 12px;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid var(--line, rgba(255, 255, 255, 0.12));
}
.stat-pill {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 8px;
  background: var(--panel, #1e2538);
  border-radius: 8px;
  border: 1px solid var(--line, rgba(255, 255, 255, 0.08));
}
.stat-lbl {
  font-size: 0.75rem;
  color: var(--sub, #8b9bb4);
}
.stat-val {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--tmp, #ffd166);
  margin-top: 2px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--line, rgba(255, 255, 255, 0.12));
}
.search-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--line, rgba(255, 255, 255, 0.15));
  color: var(--text, #fff);
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.9rem;
}
.search-input:focus {
  outline: none;
  border-color: var(--tmp, #ffd166);
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
  border: 1px solid var(--line, rgba(255, 255, 255, 0.08));
  border-radius: 10px;
  padding: 12px 14px;
}
.history-row:hover {
  border-color: var(--tmp, #ffd166);
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
  color: var(--tmp, #ffd166);
}
.history-name {
  font-size: 0.95rem;
  color: var(--text, #fff);
}
.history-stars {
  color: var(--tmp, #ffd166);
  font-size: 0.9rem;
  letter-spacing: 2px;
  margin-left: 4px;
}

.history-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 0.8rem;
  color: var(--sub, #8b9bb4);
  margin-bottom: 4px;
}
.history-time {
  margin-left: auto;
  opacity: 0.8;
}

.ending-note {
  font-size: 0.82rem;
  color: var(--sub, #8b9bb4);
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
  color: var(--good, #4cd964);
}
.score-unit {
  font-size: 0.75rem;
  color: var(--sub, #8b9bb4);
  margin-left: 2px;
}
</style>
