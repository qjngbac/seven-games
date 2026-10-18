<script setup lang="ts">
import { onMounted, onUnmounted, computed } from "vue";
import { useGameStore } from "../game/store";
import type { Action } from "../game/rules/schema";
import { sfx } from "../game/audio/sfx";

const game = useGameStore();

const initialRules = computed(() => {
  const p = game.currentPack;
  const n = game.currentModeConfig.enableDynamicRules ? p.initialActive : p.rules.length;
  return p.rules.slice(0, n);
});

const upcomingRules = computed(() => {
  const p = game.currentPack;
  if (!game.currentModeConfig.enableDynamicRules) return [];
  return p.rules.slice(p.initialActive);
});

function actionBadge(a: Action) {
  if (a === "LEFT") return { label: "← 按向左", cls: "chip blue" };
  if (a === "RIGHT") return { label: "→ 按向右", cls: "chip gold" };
  if (a === "SKIP") return { label: "↓ 跳过", cls: "chip red" };
  return { label: "🔄 反转基础规则", cls: "chip purple" };
}

function onStart() {
  game.startPlay();
}

function onBack() {
  sfx.click();
  game.goMenu();
}

function onKeyDown(e: KeyboardEvent) {
  if (e.code === "Space" || e.code === "Enter") {
    e.preventDefault();
    onStart();
  } else if (e.code === "Escape") {
    onBack();
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
    <header class="topbar">
      <div class="topbar-title">
        <span style="font-size: 1.6rem">📋</span>
        <div>
          <h1>规则情报速递</h1>
          <div class="muted" style="font-size: 0.85rem">
            【{{ game.currentModeConfig.name }}】{{ game.currentPack.name }}
          </div>
        </div>
      </div>
      <button class="btn btn-sm btn-ghost" @click="onBack">
        ← 返回重新选择
      </button>
    </header>

    <!-- 开局生效规则 -->
    <div class="card">
      <div class="section-title">
        <span>🟢 开局生效规则（共 {{ initialRules.length }} 条）</span>
        <span class="muted" style="font-size: 0.82rem">按优先级从高到低判定</span>
      </div>
      <div class="rule-list">
        <div v-for="r in initialRules" :key="r.id" class="rule-card">
          <div class="rule-main">
            <span class="priority-pill">P{{ r.priority }}</span>
            <span class="rule-text">{{ r.text }}</span>
          </div>
          <span :class="actionBadge(r.action).cls">
            {{ actionBadge(r.action).label }}
          </span>
        </div>
      </div>
    </div>

    <!-- 待揭示跑路规则 -->
    <div v-if="upcomingRules.length > 0" class="card" style="border-left: 4px solid var(--orange)">
      <div class="section-title" style="color: var(--orange)">
        <span>⚠️ 正在跑路的新规则（共 {{ upcomingRules.length }} 条）</span>
        <span class="muted" style="font-size: 0.82rem">将在游戏中途跑路入场，届时会有警报！</span>
      </div>
      <div class="rule-list">
        <div v-for="r in upcomingRules" :key="r.id" class="rule-card upcoming">
          <div class="rule-main">
            <span class="priority-pill" style="background: rgba(251, 146, 60, 0.2); color: var(--orange)">
              待入场
            </span>
            <span class="rule-text" style="color: var(--text-dim)">{{ r.text }}</span>
          </div>
          <span :class="actionBadge(r.action).cls" style="opacity: 0.7">
            {{ actionBadge(r.action).label }}
          </span>
        </div>
      </div>
    </div>

    <!-- 底部确认 -->
    <div class="card center-action-card">
      <p class="muted" style="font-size: 0.9rem; margin-bottom: 14px">
        准备好了吗？眼睛紧盯卡片，双手放在键盘上！
      </p>
      <div class="row center" style="gap: 14px">
        <button class="btn btn-primary btn-lg" style="min-width: 260px" @click="onStart">
          出发！开始判定 (空格) ▶
        </button>
        <button class="btn btn-ghost btn-lg" @click="onBack">
          返回菜单
        </button>
      </div>
      <div class="keyboard-legend" style="margin-top: 14px">
        <span>控制键：</span>
        <span class="key-pill">A / ← 向左</span>
        <span class="key-pill">S / 空格 跳过</span>
        <span class="key-pill">D / → 向右</span>
      </div>
    </div>
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
}
.rule-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rule-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
}
.rule-card.upcoming {
  background: rgba(251, 146, 60, 0.04);
  border-style: dashed;
}
.rule-main {
  display: flex;
  align-items: center;
  gap: 10px;
}
.priority-pill {
  font-size: 0.75rem;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--accent);
}
.rule-text {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
}
.chip.purple {
  background: rgba(167, 139, 250, 0.15);
  border-color: rgba(167, 139, 250, 0.4);
  color: var(--purple);
}
.center-action-card {
  text-align: center;
  padding: 20px;
}
.keyboard-legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 0.85rem;
  color: var(--text-dim);
}
.key-pill {
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--line);
  border-radius: 6px;
  font-weight: 600;
  color: var(--text);
}
</style>
