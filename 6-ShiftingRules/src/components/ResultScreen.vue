<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useGameStore } from "../game/store";
import HistoryModal from "./HistoryModal.vue";
import { sfx } from "../game/audio/sfx";

const game = useGameStore();
const showHistory = ref(false);

const res = computed(() => game.lastResult);

const outcomeTitle = computed<{ text: string; color: string }>(() => {
  if (!res.value) return { text: "结算", color: "var(--accent)" };
  if (res.value.reason === "complete") return { text: "🎉 挑战完成！", color: "var(--good)" };
  if (res.value.reason === "lives") return { text: "💥 生命耗尽", color: "var(--bad)" };
  return { text: "🏳️ 挑战结束", color: "var(--accent)" };
});

const starCount = computed(() => {
  if (!res.value) return 1;
  const acc = res.value.accuracy;
  if (acc >= 0.9 && res.value.reason === "complete") return 3;
  if (acc >= 0.7) return 2;
  return 1;
});

const topMistakeRule = computed(() => {
  if (!res.value || !res.value.mistakesByRule) return null;
  const entries = Object.entries(res.value.mistakesByRule).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0 || entries[0][1] === 0) return null;
  const [ruleId, count] = entries[0];
  if (ruleId === "default") {
    return { name: "基础默认项（无规则命中时）", count };
  }
  const r = game.currentPack.rules.find((x: { id: string }) => x.id === ruleId);
  return { name: r?.text ?? ruleId, count };
});

const isNewRecord = computed(() => {
  if (!res.value || res.value.reason === "manual") return false;
  const best = game.currentBest;
  return best && best.score <= res.value.score;
});

function onReplay() {
  sfx.click();
  game.replay();
}

function onPractice() {
  sfx.click();
  game.practice();
}

function onMenu() {
  sfx.click();
  game.goMenu();
}

function goLobby() {
  window.location.href = "../../index.html";
}

function onKeyDown(e: KeyboardEvent) {
  if (showHistory.value) return;
  if (e.code === "Space" || e.code === "Enter") {
    e.preventDefault();
    onReplay();
  } else if (e.code === "Escape") {
    e.preventDefault();
    onMenu();
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKeyDown);
});
onUnmounted(() => {
  window.removeEventListener("keydown", onKeyDown);
});
</script>

<template>
  <div class="app-shell">
    <div class="card result-card">
      <div class="result-title" :style="{ color: outcomeTitle.color }">
        {{ outcomeTitle.text }}
      </div>

      <!-- 星级与得分 -->
      <div class="stars-row">
        {{ "★".repeat(starCount) }}{{ "☆".repeat(3 - starCount) }}
      </div>

      <div class="score-showcase">
        <span class="score-digits">{{ res?.score ?? 0 }}</span>
        <span class="score-unit">分</span>
        <span v-if="isNewRecord" class="new-record-badge">🏆 新纪录！</span>
      </div>

      <div class="muted" style="font-size: 0.9rem; margin-bottom: 20px">
        【{{ game.currentModeConfig.name }}】{{ game.currentPack.name }}
      </div>

      <!-- 核心指标网格 -->
      <div class="metrics-grid">
        <div class="metric-box">
          <span class="metric-label">准确率</span>
          <span class="metric-val" style="color: var(--good)">
            {{ res ? (res.accuracy * 100).toFixed(1) : 0 }}%
          </span>
          <span class="metric-sub">{{ res?.correct ?? 0 }} / {{ res?.rounds ?? 0 }} 轮</span>
        </div>

        <div class="metric-box">
          <span class="metric-label">最高连击</span>
          <span class="metric-val" style="color: var(--orange)">
            🔥 {{ res?.maxCombo ?? 0 }}
          </span>
          <span class="metric-sub">连续正确</span>
        </div>

        <div class="metric-box">
          <span class="metric-label">平均反应</span>
          <span class="metric-val" style="color: var(--accent-2)">
            {{ res?.reaction.avg ?? 0 }}ms
          </span>
          <span class="metric-sub">最快 {{ res?.reaction.min ?? 0 }}ms</span>
        </div>
      </div>

      <!-- 最常错规则诊断 -->
      <div v-if="topMistakeRule" class="mistake-card">
        <span class="mistake-icon">⚠️</span>
        <div>
          <div style="font-weight: 700; color: #ffd666; font-size: 0.9rem">
            失误最多的规则（翻车 {{ topMistakeRule.count }} 次）：
          </div>
          <div style="font-size: 0.95rem; margin-top: 2px">{{ topMistakeRule.name }}</div>
        </div>
      </div>

      <!-- 表现评价标签 -->
      <div v-if="game.history.length > 0 && game.history[0]?.tags?.length" class="tags-container">
        <span class="tags-lbl">表现评价：</span>
        <span
          v-for="t in game.history[0].tags"
          :key="t"
          class="chip gold"
          style="font-size: 0.85rem; padding: 4px 10px"
        >
          「{{ t }}」
        </span>
      </div>

      <!-- 操作按钮群 -->
      <div class="actions-row">
        <button class="btn btn-primary btn-lg" @click="onReplay">
          再来一局 (空格) ▶
        </button>
        <button class="btn btn-ghost" @click="onPractice">
          🎯 练习室
        </button>
        <button class="btn btn-ghost" @click="showHistory = true">
          📜 历史战绩
        </button>
        <button class="btn btn-ghost" @click="onMenu">
          ≡ 返回菜单
        </button>
        <button class="btn btn-ghost" @click="goLobby">
          🏠 游戏大厅
        </button>
      </div>
    </div>

    <!-- 战绩档案弹窗 -->
    <HistoryModal v-if="showHistory" @close="showHistory = false" />
  </div>
</template>

<style scoped>
.result-card {
  text-align: center;
  padding: 32px 24px;
  max-width: 680px;
  margin: 20px auto;
}
.result-title {
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: 1px;
  margin-bottom: 8px;
}
.stars-row {
  color: var(--accent);
  font-size: 1.6rem;
  letter-spacing: 4px;
  margin-bottom: 12px;
}
.score-showcase {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  margin-bottom: 6px;
}
.score-digits {
  font-size: 3.2rem;
  font-weight: 900;
  color: var(--accent);
}
.score-unit {
  font-size: 1.1rem;
  color: var(--text-dim);
}
.new-record-badge {
  font-size: 0.85rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(255, 209, 102, 0.2);
  color: var(--accent);
  border: 1px solid var(--accent);
  margin-left: 8px;
  align-self: center;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.metric-box {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.metric-label {
  font-size: 0.8rem;
  color: var(--text-dim);
}
.metric-val {
  font-size: 1.5rem;
  font-weight: 900;
  margin: 4px 0 2px;
}
.metric-sub {
  font-size: 0.75rem;
  color: var(--text-dim);
}

.mistake-card {
  display: flex;
  align-items: center;
  text-align: left;
  gap: 12px;
  background: rgba(251, 146, 60, 0.1);
  border: 1px solid rgba(251, 146, 60, 0.3);
  border-radius: var(--radius-sm);
  padding: 12px 16px;
  margin-bottom: 18px;
}
.mistake-icon {
  font-size: 1.6rem;
}

.tags-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}
.tags-lbl {
  font-size: 0.85rem;
  color: var(--text-dim);
}

.actions-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}
</style>
