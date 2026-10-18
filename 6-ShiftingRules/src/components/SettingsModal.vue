<script setup lang="ts">
import { useGameStore } from "../game/store";
import { sfx } from "../game/audio/sfx";

const emit = defineEmits<{ (e: "close"): void }>();
const game = useGameStore();

function setVolume(e: Event) {
  const val = Number((e.target as HTMLInputElement).value);
  game.patchSettings({ volume: val });
  sfx.ensure();
  sfx.click();
}

function toggleSfx() {
  game.patchSettings({ sfx: !game.settings.sfx });
  sfx.ensure();
  sfx.click();
}

function toggleColorblind() {
  game.patchSettings({ colorblind: !game.settings.colorblind });
  sfx.click();
}

function toggleShake() {
  game.patchSettings({ shake: !game.settings.shake });
  sfx.click();
}

function toggleFontSize() {
  const next = game.settings.fontSize === "large" ? "normal" : "large";
  game.patchSettings({ fontSize: next });
  sfx.click();
}
</script>

<template>
  <div class="modal-mask" @click.self="emit('close')">
    <div class="modal-dialog">
      <div class="modal-header">
        <h2 style="font-size: 1.25rem; font-weight: 700">⚙️ 游戏设置</h2>
        <button class="btn btn-sm btn-ghost" @click="emit('close')">✕ 关闭</button>
      </div>

      <div class="modal-body">
        <div class="setting-item">
          <div>
            <div class="setting-title">🔊 音效开关</div>
            <div class="muted" style="font-size: 0.82rem">包含正确提示、倒计时、连击及规则跑路警报音</div>
          </div>
          <button class="btn btn-sm" :class="game.settings.sfx ? 'btn-primary' : 'btn-ghost'" @click="toggleSfx">
            {{ game.settings.sfx ? "已开启" : "已关闭" }}
          </button>
        </div>

        <div class="setting-item">
          <div>
            <div class="setting-title">🎚️ 音量大小</div>
            <div class="muted" style="font-size: 0.82rem">当前：{{ Math.round(game.settings.volume * 100) }}%</div>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            :value="game.settings.volume"
            @input="setVolume"
            class="vol-slider"
          />
        </div>

        <div class="setting-item">
          <div>
            <div class="setting-title">👁️ 色弱友好模式</div>
            <div class="muted" style="font-size: 0.82rem">颜色要素附带文字与高对比形状标记，绝不仅靠颜色判断</div>
          </div>
          <button class="btn btn-sm" :class="game.settings.colorblind ? 'btn-primary' : 'btn-ghost'" @click="toggleColorblind">
            {{ game.settings.colorblind ? "已开启" : "已关闭" }}
          </button>
        </div>

        <div class="setting-item">
          <div>
            <div class="setting-title">📳 答错屏幕震动</div>
            <div class="muted" style="font-size: 0.82rem">判断失误或超时时的动态震屏反馈</div>
          </div>
          <button class="btn btn-sm" :class="game.settings.shake ? 'btn-primary' : 'btn-ghost'" @click="toggleShake">
            {{ game.settings.shake ? "已开启" : "已关闭" }}
          </button>
        </div>

        <div class="setting-item">
          <div>
            <div class="setting-title">🔤 字体大小</div>
            <div class="muted" style="font-size: 0.82rem">放大卡片文字与规则文字</div>
          </div>
          <button class="btn btn-sm" :class="game.settings.fontSize === 'large' ? 'btn-primary' : 'btn-ghost'" @click="toggleFontSize">
            {{ game.settings.fontSize === "large" ? "大字号" : "正常字号" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid var(--line);
  gap: 16px;
}
.setting-item:last-child {
  border-bottom: none;
}
.setting-title {
  font-weight: 700;
  font-size: 0.95rem;
  margin-bottom: 2px;
}
.vol-slider {
  width: 140px;
  accent-color: var(--accent);
}
</style>
