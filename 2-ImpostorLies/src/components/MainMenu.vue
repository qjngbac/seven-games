<script setup lang="ts">
import { ref } from "vue";
import { useGame } from "../game/store";
import HistoryModal from "./HistoryModal.vue";

const game = useGame();
const showSettings = ref(false);
const showHistory = ref(false);
const done = () => game.progress.completed.length;

function goLobby(): void {
  window.location.href = "../../index.html";
}
</script>

<template>
  <div>
    <div class="topbar">
      <h1>🕵️ 这里有人在说谎</h1>
      <div class="row" style="gap: 8px">
        <button class="btn small ghost" @click="showHistory = true" title="查阅推理历史档案">📜 历史记录</button>
        <button class="btn small ghost" @click="goLobby()" title="返回七款小游戏大厅">🏠 游戏大厅</button>
        <button class="btn small ghost" @click="showSettings = !showSettings">⚙ 设置</button>
      </div>
    </div>

    <div class="card center">
      <p class="muted">伪装者逻辑 · 用确定性规则找出那个说谎的人</p>
      <p>已通关 <b>{{ done() }}</b> / {{ game.totalPuzzles }} 关</p>
      <div class="row" style="justify-content: center; margin-top: 14px; gap: 12px">
        <button class="btn primary" @click="game.openChapters()">开始推理 ▶</button>
        <button class="btn ghost" @click="showHistory = true">📜 历史档案</button>
        <button class="btn ghost" @click="goLobby()">🏠 游戏大厅</button>
      </div>
    </div>

    <div v-if="showSettings" class="card">
      <div class="settings-row">
        <span>音效音量</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          :value="game.settings.sfxVolume"
          @input="game.setVolume(Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <div class="settings-row">
        <span>色弱模式（颜色 + 文字/形状双编码）</span>
        <button class="btn small" :class="game.settings.colorBlind ? 'primary' : 'ghost'" @click="game.toggleColorBlind()">
          {{ game.settings.colorBlind ? "开" : "关" }}
        </button>
      </div>
      <div class="settings-row">
        <span>大字号</span>
        <button class="btn small" :class="game.settings.largeFont ? 'primary' : 'ghost'" @click="game.toggleLargeFont()">
          {{ game.settings.largeFont ? "开" : "关" }}
        </button>
      </div>
      <div class="settings-row">
        <span>减少画面抖动</span>
        <button class="btn small" :class="game.settings.reduceShake ? 'primary' : 'ghost'" @click="game.toggleReduceShake()">
          {{ game.settings.reduceShake ? "开" : "关" }}
        </button>
      </div>
    </div>

    <div class="card muted" style="font-size: 0.85rem; line-height: 1.6">
      玩法：每关给出角色与各自的陈述，所有答案都由公开规则推出且唯一。
      先标记你的判断，再提交。错了会告诉你违反了哪条规则——不靠猜。
    </div>

    <!-- 推理历史档案弹窗 -->
    <HistoryModal v-if="showHistory" @close="showHistory = false" />
  </div>
</template>
