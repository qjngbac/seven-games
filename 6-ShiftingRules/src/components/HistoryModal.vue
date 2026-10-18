<script setup lang="ts">
import { ref, computed } from "vue";
import { useGameStore } from "../game/store";
import { MODES, type ModeId } from "../game/modes/types";

const emit = defineEmits<{ (e: "close"): void }>();
const game = useGameStore();

// 默认定位到玩家当前选中的游戏模式专柜
const selectedModeId = ref<string>(game.selectedMode || "normal");
const keyword = ref("");
const confirmClear = ref(false);

const MODE_LIST: { id: ModeId | "all"; name: string; icon: string }[] = [
  { id: "normal", name: "普通模式", icon: "🎯" },
  { id: "zen", name: "禅模式", icon: "🧘" },
  { id: "daily", name: "每日挑战", icon: "📅" },
  { id: "practice", name: "练习室", icon: "📚" },
  { id: "all", name: "全模式总览", icon: "🗂️" },
];

// 计算各模式下的战绩数量
const modeCounts = computed(() => {
  const counts: Record<string, number> = {
    normal: 0,
    zen: 0,
    daily: 0,
    practice: 0,
  };
  game.history.forEach((r) => {
    if (counts[r.modeId] !== undefined) {
      counts[r.modeId]++;
    }
  });
  return counts;
});

// 当前选中模式下的原始记录（模式分开存放）
const modeRecords = computed(() => {
  if (selectedModeId.value === "all") {
    return game.history;
  }
  return game.history.filter((r) => r.modeId === selectedModeId.value);
});

// 模式内搜索过滤
const filteredRecords = computed(() => {
  const list = modeRecords.value;
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return list;
  return list.filter(
    (r) =>
      r.modeName.toLowerCase().includes(kw) ||
      r.packName.toLowerCase().includes(kw) ||
      r.tags.some((t) => t.toLowerCase().includes(kw)) ||
      r.timestamp.includes(kw)
  );
});

// 当前模式专属统计
const totalRuns = computed(() => modeRecords.value.length);
const maxScore = computed(() =>
  modeRecords.value.reduce((m, r) => Math.max(m, r.score), 0)
);
const avgAccuracy = computed(() => {
  if (totalRuns.value === 0) return "0.0";
  const sum = modeRecords.value.reduce((s, r) => s + r.accuracy, 0);
  return ((sum / totalRuns.value) * 100).toFixed(1);
});
const avgReaction = computed(() => {
  if (totalRuns.value === 0) return 0;
  const sum = modeRecords.value.reduce((s, r) => s + (r.reactionAvg || 0), 0);
  return Math.round(sum / totalRuns.value);
});

const currentModeMeta = computed(() => {
  if (selectedModeId.value === "all") {
    return { name: "全模式总览", blurb: "汇总普通模式、禅模式、每日挑战与练习室所有历史对局" };
  }
  const m = MODES[selectedModeId.value as ModeId];
  return { name: m?.name ?? selectedModeId.value, blurb: m?.blurb ?? "" };
});

function outcomeMeta(reason: "lives" | "complete" | "manual") {
  if (reason === "complete") return { label: "✓ 挑战通关", cls: "chip green" };
  if (reason === "lives") return { label: "✕ 生命耗尽", cls: "chip red" };
  return { label: "⏸ 手动退出", cls: "chip gold" };
}

function handleClear() {
  if (selectedModeId.value === "all") {
    game.clearAllHistory();
  } else {
    game.clearModeHistoryStore(selectedModeId.value);
  }
  confirmClear.value = false;
}
</script>

<template>
  <div class="modal-mask" @click.self="emit('close')">
    <div class="modal-dialog">
      <!-- 头部 -->
      <div class="modal-header">
        <div class="modal-title-group">
          <span class="modal-icon">📜</span>
          <div>
            <h2 style="font-size: 1.35rem; font-weight: 800">战绩历史档案</h2>
            <p class="modal-sub">按游戏模式独立分类存档 · 记录不同规则下的反应与连击成长</p>
          </div>
        </div>
        <button class="btn btn-sm btn-ghost" @click="emit('close')">✕ 关闭</button>
      </div>

      <!-- 模式分类导航专柜（核心：根据游戏模式分开存放） -->
      <div class="mode-nav-shelf">
        <div class="shelf-label">模式档案专柜：</div>
        <div class="mode-nav-list">
          <button
            v-for="m in MODE_LIST"
            :key="m.id"
            class="mode-nav-btn"
            :class="{ active: selectedModeId === m.id }"
            @click="selectedModeId = m.id; keyword = ''"
          >
            <span class="m-icon">{{ m.icon }}</span>
            <span class="m-name">{{ m.name }}</span>
            <span
              class="m-badge"
              :class="{ 'has-count': m.id === 'all' ? game.history.length > 0 : (modeCounts[m.id] || 0) > 0 }"
            >
              {{ m.id === "all" ? game.history.length : (modeCounts[m.id] || 0) }} 场
            </span>
          </button>
        </div>
      </div>

      <!-- 当前选定模式专柜横幅与指标 -->
      <div class="mode-banner">
        <div class="banner-desc-box">
          <strong class="banner-mode-name">{{ currentModeMeta.name }} · 战绩专柜</strong>
          <span class="banner-mode-blurb">{{ currentModeMeta.blurb }}</span>
        </div>

        <div class="stats-pills">
          <div class="stat-pill">
            <span class="stat-lbl">本模式对局</span>
            <span class="stat-val">{{ totalRuns }} <small>场</small></span>
          </div>
          <div class="stat-pill">
            <span class="stat-lbl">最高得分</span>
            <span class="stat-val" style="color: var(--accent)">{{ maxScore }} <small>分</small></span>
          </div>
          <div class="stat-pill">
            <span class="stat-lbl">平均准确率</span>
            <span class="stat-val" style="color: var(--good)">{{ avgAccuracy }}%</span>
          </div>
          <div class="stat-pill">
            <span class="stat-lbl">平均反应</span>
            <span class="stat-val" style="color: var(--accent-2)">{{ avgReaction }} <small>ms</small></span>
          </div>
        </div>
      </div>

      <!-- 工具栏：搜索与独立清空 -->
      <div class="toolbar">
        <input
          v-model="keyword"
          type="text"
          :placeholder="`在「${currentModeMeta.name}」中搜索规则包或表现标签...`"
          class="search-input"
        />

        <div class="clear-zone">
          <button
            v-if="!confirmClear"
            class="btn btn-sm btn-danger"
            :disabled="modeRecords.length === 0"
            @click="confirmClear = true"
          >
            🗑️ 清空{{ selectedModeId === "all" ? "全部" : "本模式" }}战绩
          </button>
          <div v-else class="confirm-box">
            <span style="font-size: 0.85rem; color: var(--bad)">确定清空？</span>
            <button class="btn btn-sm btn-danger" @click="handleClear">确定</button>
            <button class="btn btn-sm btn-ghost" @click="confirmClear = false">取消</button>
          </div>
        </div>
      </div>

      <!-- 记录列表 -->
      <div class="modal-body">
        <div v-if="filteredRecords.length === 0" class="empty-state">
          <div style="font-size: 3rem; margin-bottom: 8px">📂</div>
          <p class="empty-title">
            {{ modeRecords.length === 0 ? `「${currentModeMeta.name}」专柜暂无战绩记录` : "未找到匹配的战绩" }}
          </p>
          <p class="empty-hint">
            {{ modeRecords.length === 0 ? `在该模式下完成挑战后，成绩与连击记录将分类归档至此专柜。` : "请尝试其他搜索关键词" }}
          </p>
        </div>

        <div
          v-for="item in filteredRecords"
          :key="item.id"
          class="history-row"
        >
          <div class="history-main">
            <div class="history-title-row">
              <span class="chip blue chip-mode">{{ item.modeName }}</span>
              <strong class="pack-title">{{ item.packName }}</strong>
              <span :class="outcomeMeta(item.reason).cls">
                {{ outcomeMeta(item.reason).label }}
              </span>
            </div>
            <div class="history-meta">
              <span>准确率：<b>{{ (item.accuracy * 100).toFixed(0) }}%</b> ({{ item.correct }}/{{ item.rounds }})</span>
              <span>最高连击：<b>🔥 {{ item.maxCombo }}</b></span>
              <span>平均反应：<b>{{ Math.round(item.reactionAvg) }}ms</b></span>
              <span class="history-time">⏰ {{ item.timestamp }}</span>
            </div>
            <div v-if="item.tags && item.tags.length > 0" class="tag-row">
              <span v-for="t in item.tags" :key="t" class="chip gold tag-chip">
                {{ t }}
              </span>
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
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(6px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.modal-dialog {
  width: 980px;
  max-width: 96vw;
  height: 88vh;
  display: flex;
  flex-direction: column;
  background: var(--card);
  border: 1px solid var(--line-strong);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
  border-radius: 16px;
  overflow: hidden;
}

.modal-header {
  padding: 14px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
  background: rgba(15, 23, 42, 0.6);
}
.modal-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}
.modal-icon {
  font-size: 32px;
}
.modal-sub {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: var(--text-dim);
}

/* 模式分类导航专柜 */
.mode-nav-shelf {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 22px;
  background: rgba(15, 23, 42, 0.75);
  border-bottom: 1px solid var(--line);
  overflow-x: auto;
  flex-shrink: 0;
}
.shelf-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-dim);
  white-space: nowrap;
}
.mode-nav-list {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
}
.mode-nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--card);
  border: 1px solid var(--line);
  color: var(--text-dim);
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.18s ease;
  white-space: nowrap;
}
.mode-nav-btn:hover {
  color: var(--text);
  border-color: var(--accent);
}
.mode-nav-btn.active {
  background: rgba(59, 130, 246, 0.2);
  border-color: var(--accent);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.3);
}
.m-icon {
  font-size: 1.05rem;
}
.m-badge {
  font-size: 0.78rem;
  padding: 1px 6px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-dim);
}
.m-badge.has-count {
  background: rgba(59, 130, 246, 0.3);
  color: #93c5fd;
  font-weight: 700;
}
.mode-nav-btn.active .m-badge.has-count {
  background: var(--accent);
  color: #000;
}

/* 专柜横幅与指标 */
.mode-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 22px;
  background: rgba(0, 0, 0, 0.25);
  border-bottom: 1px solid var(--line);
  flex-wrap: wrap;
}
.banner-desc-box {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.banner-mode-name {
  font-size: 1.05rem;
  color: var(--text);
}
.banner-mode-blurb {
  font-size: 0.85rem;
  color: var(--text-dim);
}

.stats-pills {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.stat-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5px 12px;
  background: var(--card);
  border-radius: 8px;
  border: 1px solid var(--line);
  min-width: 80px;
}
.stat-lbl {
  font-size: 0.75rem;
  color: var(--text-dim);
}
.stat-val {
  font-size: 1.25rem;
  font-weight: 900;
  margin-top: 1px;
}
.stat-val small {
  font-size: 0.85rem;
  font-weight: normal;
  color: var(--text-dim);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 22px;
  border-bottom: 1px solid var(--line);
  background: rgba(15, 23, 42, 0.4);
}
.search-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--line-strong);
  color: var(--text);
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.95rem;
}
.search-input:focus {
  outline: none;
  border-color: var(--accent);
}
.clear-zone {
  display: flex;
  align-items: center;
  gap: 8px;
}
.confirm-box {
  display: flex;
  align-items: center;
  gap: 6px;
}

.modal-body {
  flex: 1;
  padding: 16px 22px;
  overflow-y: auto;
}
.empty-state {
  text-align: center;
  padding: 60px 0;
}
.empty-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
}
.empty-hint {
  font-size: 0.9rem;
  color: var(--text-dim);
}

.history-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1.5px solid var(--line);
  border-radius: 10px;
  padding: 14px 18px;
  margin-bottom: 10px;
  transition: all 0.15s ease;
}
.history-row:hover {
  border-color: var(--accent-2);
  background: rgba(255, 255, 255, 0.06);
}

.history-main {
  flex: 1;
  min-width: 0;
}
.history-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}
.chip-mode {
  font-size: 0.85rem;
  padding: 3px 8px;
}
.pack-title {
  font-size: 1.05rem;
}
.history-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 0.9rem;
  color: var(--text-dim);
  margin-bottom: 6px;
}
.history-meta b {
  color: var(--text);
}
.history-time {
  margin-left: auto;
  opacity: 0.85;
}
.tag-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.tag-chip {
  font-size: 0.8rem;
  padding: 2px 7px;
}

.history-score {
  margin-left: 20px;
  text-align: right;
  white-space: nowrap;
}
.score-num {
  font-size: 1.8rem;
  font-weight: 900;
  color: var(--good);
}
.score-unit {
  font-size: 0.85rem;
  color: var(--text-dim);
  margin-left: 3px;
}
</style>
