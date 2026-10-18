<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useGame } from "../stores/game";
import { ENDINGS } from "../core/game";
import { getHistoryData, clearHistory as doClearHistory } from "../services/history";

const props = defineProps<{
  open: boolean;
  initialTab?: "current" | "gallery" | "runs";
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const game = useGame();
const activeTab = ref<"current" | "gallery" | "runs">("gallery");

watch(
  () => props.open,
  (val) => {
    if (val) {
      if (props.initialTab) {
        activeTab.value = props.initialTab;
      } else if (game.inGame && game.game && game.game.choiceLog.length > 0) {
        activeTab.value = "current";
      } else {
        activeTab.value = "gallery";
      }
      refreshData();
    }
  }
);

const historyData = ref(getHistoryData());

function refreshData() {
  historyData.value = getHistoryData();
}

const allEndings = computed(() => Object.values(ENDINGS));
const unlockedEndings = computed(() => historyData.value.unlockedEndings);
const pastRuns = computed(() => historyData.value.runs);
const unlockedCount = computed(() => Object.keys(unlockedEndings.value).length);
const expandedRunId = ref<string | null>(null);

function toggleExpandRun(id: string) {
  expandedRunId.value = expandedRunId.value === id ? null : id;
}

function handleClear() {
  if (confirm("确定要清空所有通关历史与图鉴记录吗？此操作无法撤销。")) {
    doClearHistory();
    refreshData();
  }
}

function formatDelta(delta: Record<string, number | undefined>): string {
  const parts: string[] = [];
  const map: Record<string, string> = { money: "金钱", reputation: "声誉", spirit: "精神", techDebt: "技术债" };
  for (const [k, v] of Object.entries(delta)) {
    if (v != null && v !== 0) {
      parts.push(`${map[k] ?? k} ${v > 0 ? "+" + v : v}`);
    }
  }
  return parts.length ? parts.join("，") : "无数值变动";
}
</script>

<template>
  <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-box card">
      <div class="modal-header">
        <div class="tabs">
          <button
            v-if="game.inGame && game.game"
            class="tab-btn"
            :class="{ active: activeTab === 'current' }"
            @click="activeTab = 'current'"
          >
            📜 本局决策流水 ({{ game.game.choiceLog.length }})
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'gallery' }"
            @click="activeTab = 'gallery'"
          >
            🏆 结局图鉴 ({{ unlockedCount }}/{{ allEndings.length }})
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'runs' }"
            @click="activeTab = 'runs'"
          >
            📁 历史战绩 ({{ pastRuns.length }})
          </button>
        </div>
        <button class="close-btn" @click="emit('close')" title="关闭">✕</button>
      </div>

      <!-- Tab 1: 当前局决策流水 -->
      <div v-if="activeTab === 'current'" class="tab-content">
        <div v-if="!game.game || !game.game.choiceLog.length" class="empty-state">
          本周目暂未做出任何选择，去经历今天的荒诞事件吧！
        </div>
        <div v-else class="timeline">
          <div
            v-for="(log, idx) in game.game.choiceLog"
            :key="idx"
            class="timeline-item"
          >
            <div class="tl-day">第 {{ log.day }} 天 · 第 {{ idx + 1 }} 抉择</div>
            <div class="tl-title">{{ log.eventTitle }}</div>
            <div class="tl-choice">
              <span class="badge">你的选择</span>
              <span>{{ log.choiceText }}</span>
            </div>
            <div class="tl-result">{{ log.resultText }}</div>
            <div class="tl-delta" v-if="formatDelta(log.resourceDelta) !== '无数值变动'">
              ⚡ {{ formatDelta(log.resourceDelta) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: 结局图鉴 -->
      <div v-if="activeTab === 'gallery'" class="tab-content">
        <div class="gallery-desc">
          累计解锁 <b>{{ unlockedCount }}</b> / {{ allEndings.length }} 种结局。不同属性走向、极端数值与关键抉择将导向完全不同的荒诞命运。
        </div>
        <div class="gallery-grid">
          <div
            v-for="e in allEndings"
            :key="e.key"
            class="ending-card"
            :class="[
              unlockedEndings[e.key] ? 'unlocked' : 'locked',
              e.kind === 'win' ? 'kind-win' : 'kind-lose'
            ]"
          >
            <div class="ec-top">
              <span class="ec-icon">{{ unlockedEndings[e.key] ? e.icon : '❓' }}</span>
              <div class="ec-info">
                <div class="ec-title">
                  {{ unlockedEndings[e.key] ? e.title : '未解锁结局' }}
                </div>
                <div class="ec-honor" v-if="unlockedEndings[e.key]">
                  称号：{{ e.honor }}
                </div>
              </div>
              <span class="ec-tag" :class="e.kind">
                {{ e.kind === 'win' ? '通关胜利' : '崩盘出局' }}
              </span>
            </div>

            <div class="ec-body" v-if="unlockedEndings[e.key]">
              <p class="ec-text">{{ e.text }}</p>
              <div class="ec-meta">
                <span>达成 {{ unlockedEndings[e.key].count }} 次</span>
                <span class="cond">条件：{{ e.conditionDesc }}</span>
              </div>
            </div>
            <div class="ec-body locked-body" v-else>
              <p class="ec-clue">💡 解锁线索：{{ e.conditionDesc }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 3: 历史战绩 -->
      <div v-if="activeTab === 'runs'" class="tab-content">
        <div v-if="!pastRuns.length" class="empty-state">
          暂无历史通关记录。只要打完一局（无论通关还是中途暴毙），都会永久铭刻在此！
        </div>
        <div v-else class="runs-list">
          <div
            v-for="run in pastRuns"
            :key="run.id"
            class="run-card"
          >
            <div class="run-header" @click="toggleExpandRun(run.id)">
              <div class="run-main">
                <span class="run-badge" :class="run.endingKind">
                  {{ run.endingKind === 'win' ? '🎉 通关' : '💀 结局' }}
                </span>
                <span class="run-title">{{ run.endingTitle }}</span>
                <span class="run-honor">「{{ run.honor }}」</span>
              </div>
              <div class="run-meta">
                <span>{{ run.dateStr }}</span>
                <span>坚持至第 {{ run.day }} 天</span>
                <span class="expand-indicator">{{ expandedRunId === run.id ? '▲ 收起' : '▼ 历程流水' }}</span>
              </div>
            </div>

            <div class="run-res">
              <span class="chip">💰 金钱 {{ run.finalResources.money }}</span>
              <span class="chip">⭐ 声誉 {{ run.finalResources.reputation }}</span>
              <span class="chip">🧠 精神 {{ run.finalResources.spirit }}</span>
              <span class="chip">💣 技术债 {{ run.finalResources.techDebt }}</span>
              <span class="chip" v-if="run.traitName">身份: {{ run.traitName }}</span>
            </div>

            <!-- 折叠决策流水 -->
            <div v-if="expandedRunId === run.id" class="run-detail">
              <div class="detail-h">本局 {{ run.choicesCount }} 次荒诞抉择回顾：</div>
              <div class="detail-timeline">
                <div v-for="(log, i) in run.choiceLog" :key="i" class="detail-item">
                  <div class="di-line">
                    <b>第 {{ log.day }} 天</b> · {{ log.eventTitle }}
                  </div>
                  <div class="di-choice">👉 {{ log.choiceText }}</div>
                  <div class="di-result">{{ log.resultText }}</div>
                </div>
              </div>
            </div>
          </div>

          <div style="text-align: right; margin-top: 16px">
            <button class="btn ghost danger-btn" @click="handleClear">🗑 清空历史档案</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
  backdrop-filter: blur(2px);
}
.modal-box {
  width: 100%;
  max-width: 760px;
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.2);
  padding: 0;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
  background: #fdfcf7;
  padding: 8px 14px 0;
}
.tabs {
  display: flex;
  gap: 6px;
}
.tab-btn {
  border: none;
  background: transparent;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s ease;
}
.tab-btn:hover {
  color: var(--text);
}
.tab-btn.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
.close-btn {
  border: none;
  background: transparent;
  font-size: 18px;
  color: var(--muted);
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
}
.close-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #000;
}
.tab-content {
  padding: 18px;
  overflow-y: auto;
  flex: 1;
}
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.8;
}

/* Timeline */
.timeline {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.timeline-item {
  background: #fbfbfa;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 12px 14px;
}
.tl-day {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
}
.tl-title {
  font-size: 15px;
  font-weight: 700;
  margin: 2px 0 6px;
}
.tl-choice {
  font-size: 14px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.badge {
  background: #eef3ff;
  color: #2b55c4;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
}
.tl-result {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  background: #fff;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px dashed #e5e5dc;
}
.tl-delta {
  font-size: 12px;
  color: var(--accent);
  font-weight: 600;
  margin-top: 6px;
}

/* Gallery Grid */
.gallery-desc {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 14px;
}
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}
.ending-card {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px;
  background: #fff;
  transition: transform 0.12s ease;
}
.ending-card.locked {
  background: #f7f6f1;
  opacity: 0.75;
}
.ec-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.ec-icon {
  font-size: 24px;
}
.ec-info {
  flex: 1;
}
.ec-title {
  font-weight: 700;
  font-size: 14px;
}
.ec-honor {
  font-size: 12px;
  color: var(--warn);
  font-weight: 600;
}
.ec-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 99px;
}
.ec-tag.win {
  background: #eafaf1;
  color: #1e824c;
}
.ec-tag.lose {
  background: #fdf2f2;
  color: #d9534f;
}
.ec-text {
  font-size: 12.5px;
  line-height: 1.55;
  color: #444;
  margin: 0 0 8px;
}
.ec-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--muted);
  border-top: 1px dashed var(--line);
  padding-top: 6px;
}
.cond {
  color: #777;
}
.locked-body {
  padding-top: 4px;
}
.ec-clue {
  font-size: 12px;
  color: var(--muted);
  margin: 0;
  line-height: 1.5;
}

/* Run History */
.runs-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.run-card {
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fcfbfa;
  padding: 12px 14px;
}
.run-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
}
.run-main {
  display: flex;
  align-items: center;
  gap: 8px;
}
.run-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 700;
}
.run-badge.win {
  background: #eafaf1;
  color: #1e824c;
}
.run-badge.lose {
  background: #fdf2f2;
  color: #d9534f;
}
.run-title {
  font-weight: 700;
  font-size: 14.5px;
}
.run-honor {
  font-size: 12px;
  color: var(--warn);
}
.run-meta {
  font-size: 12px;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 10px;
}
.expand-indicator {
  color: var(--accent);
  font-weight: 600;
}
.run-res {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.run-res .chip {
  font-size: 11px;
  background: #fff;
  border: 1px solid #e3e1d5;
  padding: 2px 6px;
  border-radius: 6px;
}
.run-detail {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--line);
}
.detail-h {
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  margin-bottom: 8px;
}
.detail-timeline {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
  padding-right: 4px;
}
.detail-item {
  background: #fff;
  border: 1px solid #eae8de;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
}
.di-line {
  color: #333;
}
.di-choice {
  color: var(--accent);
  margin: 2px 0;
  font-weight: 600;
}
.di-result {
  color: #666;
}
.danger-btn {
  color: var(--crit);
  font-size: 12px;
  padding: 4px 10px;
}
</style>
