<script setup lang="ts">
import { ref, computed } from "vue";
import { useGameStore } from "../game/store";
import { PACKS } from "../data/packs";
import type { ModeId } from "../game/modes/types";
import SettingsModal from "./SettingsModal.vue";
import HistoryModal from "./HistoryModal.vue";
import { sfx } from "../game/audio/sfx";

const game = useGameStore();

const showSettings = ref(false);
const showHistory = ref(false);

const modesList: { id: ModeId; icon: string; name: string; desc: string }[] = [
  { id: "normal", icon: "⚡", name: "普通模式", desc: "30 轮挑战 · 3 点生命 · 动态跑路" },
  { id: "zen", icon: "🧘", name: "禅模式", desc: "无倒计时 · 无限生命 · 轻松反应训练" },
  { id: "daily", icon: "📅", name: "每日挑战", desc: "全员同题 · 每日刷新 · 公平计分" },
  { id: "practice", icon: "🎯", name: "练习室", desc: "规则全生效 · 无扣分压力" },
];

const PACK_ICONS: Record<string, string> = {
  "pack-base": "🎨",
  "pack-parity": "🔢",
  "pack-character": "🐱",
  "pack-text": "🔤",
  "pack-extreme": "💥",
  "pack-combo": "🔀",
};

function selectMode(m: ModeId) {
  sfx.click();
  game.selectedMode = m;
}

function selectPack(pId: string) {
  sfx.click();
  game.selectedPack = pId;
}

function onStart() {
  game.startPreview();
}

function goLobby() {
  window.location.href = "../../index.html";
}

const isDailyDoneToday = computed(() => {
  return game.isDailyDone(game.dailyKey());
});
</script>

<template>
  <div class="app-shell">
    <!-- 顶部栏 -->
    <header class="topbar">
      <div class="topbar-title">
        <span style="font-size: 1.8rem">🏃</span>
        <div>
          <h1>规则正在跑路</h1>
          <div class="muted" style="font-size: 0.85rem">动态规则变化反应模拟器</div>
        </div>
      </div>
      <div class="row">
        <button class="btn btn-sm btn-ghost" @click="showHistory = true" title="查阅历史战绩档案">
          📜 战绩历史 ({{ game.history.length }})
        </button>
        <button class="btn btn-sm btn-ghost" @click="showSettings = true" title="设置音量与无障碍模式">
          ⚙️ 设置
        </button>
        <button class="btn btn-sm btn-ghost" @click="goLobby()" title="返回七款小游戏大厅">
          🏠 游戏大厅
        </button>
      </div>
    </header>

    <!-- ① 模式选择 -->
    <section class="card" style="padding: 16px 20px">
      <div class="section-title">
        <span>① 选择游戏模式</span>
      </div>
      <div class="mode-grid">
        <div
          v-for="m in modesList"
          :key="m.id"
          class="mode-card"
          :class="{ active: game.selectedMode === m.id }"
          @click="selectMode(m.id)"
        >
          <div class="mode-header">
            <span class="mode-icon">{{ m.icon }}</span>
            <strong class="mode-name">{{ m.name }}</strong>
            <span v-if="m.id === 'daily' && isDailyDoneToday" class="chip green" style="font-size: 0.72rem">
              今日已挑战
            </span>
          </div>
          <div class="mode-desc">{{ m.desc }}</div>
        </div>
      </div>
    </section>

    <!-- ② 规则包选择 -->
    <section class="card" style="padding: 16px 20px">
      <div class="section-title">
        <span>② 选择规则包</span>
        <span class="muted" style="font-size: 0.82rem">每款规则包包含独特的判定逻辑与跑路节奏</span>
      </div>
      <div class="pack-grid">
        <div
          v-for="p in PACKS"
          :key="p.id"
          class="pack-card"
          :class="{ active: game.selectedPack === p.id }"
          @click="selectPack(p.id)"
        >
          <div class="pack-top">
            <span class="pack-icon">{{ PACK_ICONS[p.id] || "📦" }}</span>
            <div class="pack-info">
              <strong class="pack-name">{{ p.name }}</strong>
              <div class="pack-diff">
                <span style="color: var(--accent)">难度 {{ "★".repeat(p.ruleset.difficulty) }}</span>
                <span class="muted" style="margin-left: 6px">· {{ p.ruleset.rules.length }} 条规则</span>
              </div>
            </div>
          </div>
          <div class="pack-preview">
            <span class="pack-init-badge">开局生效 {{ p.ruleset.initialActive }} 条</span>
            <span v-if="p.ruleset.rules.length > p.ruleset.initialActive" class="pack-run-badge">
              中途跑路 {{ p.ruleset.rules.length - p.ruleset.initialActive }} 条
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- 底部操作与最佳成绩 -->
    <div class="card center-action-card">
      <div class="best-record-display">
        <span v-if="game.currentBest" class="best-badge">
          🏆 当前模式最佳：<b>{{ game.currentBest.score }}</b> 分 · 准确率 {{ (game.currentBest.accuracy * 100).toFixed(0) }}% ({{ game.currentBest.date }})
        </span>
        <span v-else class="muted" style="font-size: 0.9rem">
          当前模式与规则包暂无最佳纪录，快去创造新纪录吧！
        </span>
      </div>

      <div class="row center" style="margin-top: 14px; gap: 14px">
        <button class="btn btn-primary btn-lg" style="min-width: 260px" @click="onStart">
          开始挑战 ▶
        </button>
      </div>

      <div class="keyboard-legend">
        <span>操作按键：</span>
        <span class="key-pill">A / ← 向左</span>
        <span class="key-pill">S / 空格 跳过</span>
        <span class="key-pill">D / → 向右</span>
      </div>
    </div>

    <!-- 弹窗组件 -->
    <SettingsModal v-if="showSettings" @close="showSettings = false" />
    <HistoryModal v-if="showHistory" @close="showHistory = false" />
  </div>
</template>

<style scoped>
.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--accent);
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
}
.mode-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.mode-card:hover {
  border-color: var(--accent-2);
  background: rgba(255, 255, 255, 0.06);
  transform: translateY(-2px);
}
.mode-card.active {
  border-color: var(--accent);
  background: rgba(255, 209, 102, 0.08);
  box-shadow: 0 0 16px rgba(255, 209, 102, 0.15);
}
.mode-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.mode-icon {
  font-size: 1.3rem;
}
.mode-name {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text);
}
.mode-desc {
  font-size: 0.92rem;
  color: var(--text-dim);
  line-height: 1.45;
}

.pack-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}
.pack-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 16px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.pack-card:hover {
  border-color: var(--accent-2);
  background: rgba(255, 255, 255, 0.06);
  transform: translateY(-2px);
}
.pack-card.active {
  border-color: var(--accent);
  background: rgba(255, 209, 102, 0.08);
  box-shadow: 0 0 16px rgba(255, 209, 102, 0.15);
}
.pack-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.pack-icon {
  font-size: 2.2rem;
  line-height: 1;
}
.pack-info {
  flex: 1;
}
.pack-name {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--text);
}
.pack-diff {
  font-size: 0.95rem;
  margin-top: 4px;
}
.pack-preview {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.pack-init-badge {
  font-size: 0.85rem;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(91, 192, 235, 0.15);
  color: var(--accent-2);
  border: 1px solid rgba(91, 192, 235, 0.3);
}
.pack-run-badge {
  font-size: 0.85rem;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(251, 146, 60, 0.15);
  color: var(--orange);
  border: 1px solid rgba(251, 146, 60, 0.3);
}

.center-action-card {
  text-align: center;
  padding: 24px 20px;
}
.best-record-display {
  min-height: 24px;
}
.best-badge {
  font-size: 1.05rem;
  color: var(--accent);
}
.keyboard-legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
  font-size: 0.95rem;
  color: var(--text-dim);
  flex-wrap: wrap;
}
.key-pill {
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--line);
  border-radius: 6px;
  font-weight: 700;
  color: var(--text);
}
</style>
