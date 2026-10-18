<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useGameStore } from "../game/store";
import StimulusCard from "./StimulusCard.vue";
import type { Action } from "../game/rules/schema";
import { sfx } from "../game/audio/sfx";

const game = useGameStore();

const keyPressed = ref<Action | null>(null);

const stimulus = computed(() => game.currentRound?.stimulus);

const isShaking = computed(() => {
  return game.settings.shake && game.lastFeedback?.kind === "wrong";
});

const timerBarColor = computed(() => {
  const p = game.timePercent;
  if (p > 50) return "var(--good)";
  if (p > 25) return "var(--accent)";
  return "var(--bad)";
});

function handleAction(a: Action) {
  // 如果处于新规则暂停状态，任何操作按钮都作为确认继续，而不消耗答题
  if (game.isRulePaused) {
    game.resumeAfterNewRule();
    return;
  }
  keyPressed.value = a;
  window.setTimeout(() => {
    keyPressed.value = null;
  }, 120);
  game.submitAction(a);
}

function handleKeyDown(e: KeyboardEvent) {
  // 战术暂停期间：按任意键、空格、回车均可看清后继续
  if (game.isRulePaused) {
    if (
      e.code === "Space" ||
      e.code === "Enter" ||
      e.code === "KeyA" ||
      e.code === "KeyD" ||
      e.code === "KeyS" ||
      e.code === "ArrowLeft" ||
      e.code === "ArrowRight" ||
      e.code === "ArrowDown"
    ) {
      e.preventDefault();
      game.resumeAfterNewRule();
    }
    return;
  }

  if (e.code === "KeyA" || e.code === "ArrowLeft") {
    e.preventDefault();
    handleAction("LEFT");
  } else if (e.code === "KeyD" || e.code === "ArrowRight") {
    e.preventDefault();
    handleAction("RIGHT");
  } else if (e.code === "KeyS" || e.code === "ArrowDown" || e.code === "Space") {
    e.preventDefault();
    handleAction("SKIP");
  } else if (e.code === "Escape") {
    e.preventDefault();
    onSurrender();
  }
}

function onSurrender() {
  if (confirm("确定要提前结束本局挑战吗？")) {
    sfx.click();
    game.surrender();
  }
}

function goLobby() {
  if (confirm("返回游戏大厅将退出当前对局，确定吗？")) {
    window.location.href = "../../index.html";
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
});
onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
});
</script>

<template>
  <div class="app-shell" :class="{ shake: isShaking }">
    <!-- 顶部 HUD 仪表盘 -->
    <header class="hud-bar card">
      <div class="hud-left">
        <span class="chip blue chip-large">{{ game.currentModeConfig.name }}</span>
        <span class="chip chip-large">{{ game.currentPack.name }}</span>
        <span class="round-counter">
          第 <b>{{ game.roundIndex }}</b> / {{ game.currentModeConfig.targetRounds >= 999 ? "∞" : game.targetRounds }} 轮
        </span>
      </div>

      <div class="hud-center">
        <div class="score-display">
          <span class="score-label">得分</span>
          <span class="score-number">{{ game.score }}</span>
        </div>
        <div v-if="game.combo >= 2" class="combo-badge">
          🔥 {{ game.combo }} 连击
        </div>
      </div>

      <div class="hud-right">
        <!-- 生命值 -->
        <div v-if="game.currentModeConfig.lives > 0" class="lives-display">
          <span
            v-for="n in game.currentModeConfig.lives"
            :key="n"
            class="heart-icon"
            :class="{ active: n <= game.lives }"
          >
            {{ n <= game.lives ? "❤️" : "🖤" }}
          </span>
        </div>
        <button class="btn btn-ghost" @click="onSurrender" title="提前结束并结算">
          🏳️ 认输
        </button>
        <button class="btn btn-ghost" @click="goLobby" title="返回游戏大厅">
          🏠 大厅
        </button>
      </div>
    </header>

    <!-- 倒计时进度条 -->
    <div v-if="game.deadlineMs > 0" class="timer-track">
      <div
        class="timer-bar"
        :style="{ width: game.timePercent + '%', backgroundColor: timerBarColor }"
      />
    </div>

    <!-- 当前生效规则快速参考栏（字体放大，清晰高对比） -->
    <div class="rules-quick-bar">
      <div class="rules-bar-label">生效规则：</div>
      <div class="rules-chips-scroll">
        <div
          v-for="r in game.activeRules"
          :key="r.id"
          class="rule-chip"
          :class="{ 'chip-highlight': game.newRuleAlert && r.id === game.newRuleAlert.id }"
        >
          <span class="rule-chip-p">P{{ r.priority }}</span>
          <span class="rule-chip-text">{{ r.text }}</span>
        </div>
      </div>
    </div>

    <!-- 主舞台：刺激卡片 -->
    <main class="arena-stage">
      <div class="stimulus-wrapper">
        <StimulusCard
          v-if="stimulus"
          :stimulus="stimulus"
          :colorblind="game.settings.colorblind"
        />

        <!-- 即时判定反馈提示 -->
        <transition name="feedback-pop">
          <div
            v-if="game.lastFeedback"
            class="feedback-pill"
            :class="game.lastFeedback.kind"
          >
            {{ game.lastFeedback.message }}
          </div>
        </transition>
      </div>
    </main>

    <!-- 底部控制手柄按钮（超大触控区与字号） -->
    <footer class="action-footer">
      <button
        class="action-btn btn-left"
        :class="{ active: keyPressed === 'LEFT' }"
        @click="handleAction('LEFT')"
      >
        <span class="arrow-symbol">←</span>
        <span class="action-name">向左</span>
        <span class="key-shortcut">[ A ] / [ ← ]</span>
      </button>

      <button
        class="action-btn btn-skip"
        :class="{ active: keyPressed === 'SKIP' }"
        @click="handleAction('SKIP')"
      >
        <span class="arrow-symbol">↓</span>
        <span class="action-name">跳过</span>
        <span class="key-shortcut">[ S ] / [ 空格 ]</span>
      </button>

      <button
        class="action-btn btn-right"
        :class="{ active: keyPressed === 'RIGHT' }"
        @click="handleAction('RIGHT')"
      >
        <span class="arrow-symbol">→</span>
        <span class="action-name">向右</span>
        <span class="key-shortcut">[ D ] / [ → ]</span>
      </button>
    </footer>

    <!-- 新规则跑路入场 · 战术暂停弹窗（倒计时停止，看清规则再开始下一轮） -->
    <transition name="fade">
      <div v-if="game.isRulePaused && game.newRuleAlert" class="rule-pause-overlay">
        <div class="rule-pause-card card">
          <div class="pause-header">
            <span class="pause-icon">🚨</span>
            <div>
              <h2 class="pause-headline">规则跑路 · 战术暂停中</h2>
              <p class="pause-sub">已自动停止倒计时！请看清下轮即将生效的新规则与优先级判定</p>
            </div>
          </div>

          <!-- 新规则焦点大卡片 -->
          <div class="new-rule-showcase">
            <div class="priority-badge">优先级 P{{ game.newRuleAlert.priority }}</div>
            <div class="new-rule-text">{{ game.newRuleAlert.text }}</div>
            <div class="new-rule-tip">
              💡 规则生效要点：当出现符合特征的刺激时，必须执行对应动作；多个规则冲突时依 P 值高者为准！
            </div>
          </div>

          <!-- 当前所有生效规则一览 -->
          <div class="active-rules-summary">
            <div class="summary-title">📜 包含新规则后的全部生效规则列表：</div>
            <div class="summary-chips-wrap">
              <div
                v-for="r in game.activeRules"
                :key="r.id"
                class="summary-chip"
                :class="{ 'is-just-added': r.id === game.newRuleAlert.id }"
              >
                <span class="sc-p">P{{ r.priority }}</span>
                <span class="sc-txt">{{ r.text }}</span>
                <span v-if="r.id === game.newRuleAlert.id" class="sc-new-badge">🔥 新加入</span>
              </div>
            </div>
          </div>

          <button class="btn btn-lg btn-primary resume-big-btn" @click="game.resumeAfterNewRule">
            ▶ 我已看清，开始第 {{ game.roundIndex + 1 }} 轮 (按任意键/空格/回车)
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.hud-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 22px;
  margin-bottom: 10px;
  gap: 14px;
  flex-wrap: wrap;
}
.hud-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.chip-large {
  font-size: 1rem;
  padding: 5px 12px;
}
.round-counter {
  font-size: 1.15rem;
  color: var(--text);
  margin-left: 6px;
}
.round-counter b {
  font-size: 1.35rem;
  color: #fff;
}
.hud-center {
  display: flex;
  align-items: center;
  gap: 14px;
}
.score-display {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.score-label {
  font-size: 0.95rem;
  color: var(--text-dim);
}
.score-number {
  font-size: 2.2rem;
  font-weight: 900;
  color: var(--good);
  letter-spacing: 0.5px;
}
.combo-badge {
  font-size: 1.05rem;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 8px;
  background: rgba(251, 146, 60, 0.25);
  color: var(--orange);
  border: 1px solid rgba(251, 146, 60, 0.45);
  animation: pulse-glow 1s infinite alternate;
}
@keyframes pulse-glow {
  from { transform: scale(1); }
  to { transform: scale(1.06); }
}

.hud-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.lives-display {
  display: flex;
  gap: 3px;
  font-size: 1.35rem;
}

/* 计时进度条 */
.timer-track {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  margin-bottom: 14px;
  overflow: hidden;
}
.timer-bar {
  height: 100%;
  transition: width 0.04s linear, background-color 0.2s;
}

/* 规则参考条（字体加大、清晰高亮） */
.rules-quick-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 18px;
  background: rgba(15, 23, 42, 0.7);
  border: 1.5px solid rgba(255, 255, 255, 0.16);
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
  overflow: hidden;
}
.rules-bar-label {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--accent);
  white-space: nowrap;
}
.rules-chips-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: none;
}
.rules-chips-scroll::-webkit-scrollbar {
  display: none;
}
.rule-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1.5px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 1.05rem;
  transition: all 0.2s;
}
.rule-chip-p {
  color: var(--accent);
  font-weight: 900;
  font-size: 0.95rem;
  background: rgba(255, 209, 102, 0.18);
  padding: 2px 6px;
  border-radius: 4px;
}
.rule-chip-text {
  color: #ffffff;
  font-weight: 700;
}
.rule-chip.chip-highlight {
  border-color: var(--orange);
  background: rgba(251, 146, 60, 0.2);
  box-shadow: 0 0 12px rgba(251, 146, 60, 0.35);
}

/* 主舞台 */
.arena-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 0 20px;
}
.stimulus-wrapper {
  position: relative;
  width: 100%;
  max-width: 460px;
}
.feedback-pill {
  position: absolute;
  top: -16px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 22px;
  border-radius: 24px;
  font-size: 1.15rem;
  font-weight: 800;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
  z-index: 10;
  pointer-events: none;
}
.feedback-pill.correct {
  background: var(--good);
  color: #0b2210;
}
.feedback-pill.wrong,
.feedback-pill.timeout {
  background: var(--bad);
  color: #ffffff;
}

.feedback-pop-enter-active,
.feedback-pop-leave-active {
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.feedback-pop-enter-from {
  opacity: 0;
  transform: translate(-50%, 10px) scale(0.85);
}
.feedback-pop-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px) scale(0.9);
}

/* 底部操作区 */
.action-footer {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  margin-top: auto;
}
.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 18px 14px;
  background: var(--card);
  border: 2.5px solid var(--line-strong);
  border-radius: 16px;
  color: var(--text);
  cursor: pointer;
  user-select: none;
  transition: all 0.12s ease;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
}
.action-btn:hover {
  transform: translateY(-2px);
  background: var(--card-hover);
}
.action-btn:active,
.action-btn.active {
  transform: translateY(2px) scale(0.98);
}

.btn-left {
  border-color: rgba(91, 192, 235, 0.45);
}
.btn-left:hover,
.btn-left.active {
  border-color: var(--accent-2);
  background: rgba(91, 192, 235, 0.18);
  box-shadow: 0 0 24px rgba(91, 192, 235, 0.35);
}

.btn-skip {
  border-color: rgba(255, 107, 107, 0.45);
}
.btn-skip:hover,
.btn-skip.active {
  border-color: var(--bad);
  background: rgba(255, 107, 107, 0.18);
  box-shadow: 0 0 24px rgba(255, 107, 107, 0.35);
}

.btn-right {
  border-color: rgba(255, 209, 102, 0.45);
}
.btn-right:hover,
.btn-right.active {
  border-color: var(--accent);
  background: rgba(255, 209, 102, 0.18);
  box-shadow: 0 0 24px rgba(255, 209, 102, 0.35);
}

.arrow-symbol {
  font-size: 2.5rem;
  line-height: 1;
  font-weight: 900;
  margin-bottom: 4px;
}
.action-name {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: 1px;
}
.key-shortcut {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-dim);
  margin-top: 4px;
}

/* 战术暂停弹窗（新规则跑路） */
.rule-pause-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(6px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.rule-pause-card {
  width: 100%;
  max-width: 620px;
  background: #151b33;
  border: 2px solid var(--orange);
  border-radius: 18px;
  padding: 24px 28px;
  box-shadow: 0 20px 60px rgba(251, 146, 60, 0.25);
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: modal-enter 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes modal-enter {
  from { opacity: 0; transform: scale(0.92) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.pause-header {
  display: flex;
  align-items: center;
  gap: 14px;
  border-bottom: 1px solid var(--line);
  padding-bottom: 12px;
}
.pause-icon {
  font-size: 38px;
}
.pause-headline {
  margin: 0;
  font-size: 1.35rem;
  color: var(--orange);
  font-weight: 900;
}
.pause-sub {
  margin: 4px 0 0;
  font-size: 0.92rem;
  color: var(--text-dim);
}

.new-rule-showcase {
  background: rgba(251, 146, 60, 0.12);
  border: 2px solid var(--orange);
  border-radius: 14px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
}
.priority-badge {
  background: var(--orange);
  color: #000;
  font-weight: 900;
  font-size: 0.95rem;
  padding: 3px 12px;
  border-radius: 12px;
  letter-spacing: 1px;
}
.new-rule-text {
  font-size: 1.85rem;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 1px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
}
.new-rule-tip {
  font-size: 0.95rem;
  color: #fbd38d;
  line-height: 1.5;
}

.active-rules-summary {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  padding: 12px 16px;
  border: 1px solid var(--line);
}
.summary-title {
  font-size: 0.92rem;
  color: var(--text-dim);
  margin-bottom: 8px;
  font-weight: 700;
}
.summary-chips-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.summary-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--line);
  font-size: 0.95rem;
}
.summary-chip.is-just-added {
  background: rgba(251, 146, 60, 0.25);
  border-color: var(--orange);
  color: #fff;
  font-weight: 800;
}
.sc-p {
  color: var(--accent);
  font-weight: 900;
  font-size: 0.85rem;
}
.sc-txt {
  color: #ffffff;
}
.sc-new-badge {
  font-size: 0.78rem;
  color: var(--orange);
  font-weight: 900;
}

.resume-big-btn {
  width: 100%;
  padding: 16px;
  font-size: 1.25rem;
  font-weight: 800;
  border-radius: 12px;
  margin-top: 6px;
}
</style>
