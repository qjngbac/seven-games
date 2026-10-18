<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../store'

const emit = defineEmits<{ (e: 'close'): void }>()
const store = useGameStore()

const keyword = ref('')

const filteredRecords = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return store.history
  return store.history.filter(
    (r) =>
      r.title.toLowerCase().includes(kw) ||
      `第${r.chapter}章`.includes(kw) ||
      r.timestamp.includes(kw)
  )
})

const sGradeCount = computed(() => {
  return Object.values(store.savedProgress.grades).filter((g) => g === 'S').length
})

function handleClear() {
  if (confirm('确定要清空所有工单排障历史记录吗？（已通关最高评级将保留）')) {
    store.clearAllHistory()
  }
}
</script>

<template>
  <div class="modal-mask" @click.self="emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h2 style="margin: 0; font-size: 1.25rem">📜 机房维修工单档案</h2>
        <button class="ghost" @click="emit('close')">✕ 关闭</button>
      </div>

      <div class="stats-bar">
        <div class="stat-pill">
          <span class="stat-lbl">维修卷宗</span>
          <span class="stat-val">{{ store.history.length }} 份</span>
        </div>
        <div class="stat-pill">
          <span class="stat-lbl">已修通工单</span>
          <span class="stat-val">{{ store.savedProgress.completed.length }} / {{ store.workOrders.length }}</span>
        </div>
        <div class="stat-pill">
          <span class="stat-lbl">S 级排障</span>
          <span class="stat-val" style="color: var(--ok)">{{ sGradeCount }} 次</span>
        </div>
      </div>

      <div class="toolbar">
        <input
          v-model="keyword"
          type="text"
          placeholder="搜索工单标题或章节..."
          class="search-input"
        />
        <button
          v-if="store.history.length > 0"
          class="ghost text-danger"
          @click="handleClear"
        >
          🗑️ 清空历史
        </button>
      </div>

      <div class="record-list">
        <div v-if="filteredRecords.length === 0" class="empty-state">
          <p class="muted">
            {{ store.history.length === 0 ? '暂无工单维修记录，排障提交后将自动归档。' : '未找到匹配的工单记录。' }}
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
              <strong class="history-name">{{ item.title }}</strong>
              <span
                class="tag"
                :class="item.cleared ? 'rev' : 'risk'"
                style="margin-left: 6px"
              >
                {{ item.cleared ? `验收通过 · ${item.grade} 级` : (item.boom ? '💥 发生爆炸' : '验收未通过') }}
              </span>
            </div>
            <div class="history-meta">
              <span>⏱️ 耗费 {{ item.timeUsed }} / {{ item.timeBudget }} 步</span>
              <span v-if="item.riskyCount > 0" style="color: var(--warn)">⚠️ 高风险 {{ item.riskyCount }} 步</span>
              <span v-if="item.damageCount > 0" style="color: var(--bad)">❌ 连带损失 {{ item.damageCount }} 项</span>
              <span class="history-time">{{ item.timestamp }}</span>
            </div>
            <div v-if="item.funny" class="funny-note">
              {{ item.funny }}
            </div>
          </div>
          <div class="history-score">
            <span class="score-num" :style="{ color: item.cleared ? 'var(--ok)' : 'var(--bad)' }">
              {{ item.score }}
            </span>
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
  border-bottom: 1px solid var(--line);
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
  border-color: var(--accent);
}
.text-danger {
  color: var(--bad);
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
  background: var(--bg-soft);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 12px 14px;
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
  background: var(--panel-2);
  color: var(--accent);
}
.history-name {
  font-size: 0.95rem;
  color: var(--text);
}

.history-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 0.8rem;
  color: var(--text-dim);
  margin-bottom: 4px;
}
.history-time {
  margin-left: auto;
  opacity: 0.8;
}

.funny-note {
  font-size: 0.82rem;
  color: var(--muted);
  line-height: 1.4;
  margin-top: 4px;
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
.score-unit {
  font-size: 0.75rem;
  color: var(--text-dim);
  margin-left: 2px;
}
</style>
