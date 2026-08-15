<script setup lang="ts">
import { useGame } from '../game/store';
const g = useGame();
</script>

<template>
  <div class="row spread">
    <button class="btn-ghost" @click="g.goMenu()">← 返回</button>
    <strong>设置</strong>
    <span />
  </div>

  <div class="card grid" style="gap: 16px; max-width: 520px">
    <div class="row spread">
      <span>字号</span>
      <div class="row">
        <button :class="{ 'btn-primary': g.settings.fontSize === 'normal' }" @click="(g.settings.fontSize = 'normal'), g.persistSettings()">标准</button>
        <button :class="{ 'btn-primary': g.settings.fontSize === 'large' }" @click="(g.settings.fontSize = 'large'), g.persistSettings()">大字号</button>
      </div>
    </div>

    <div class="row spread">
      <span>色弱模式（强化文字标签）</span>
      <button :class="{ 'btn-primary': g.settings.colorblind }" @click="(g.settings.colorblind = !g.settings.colorblind), g.persistSettings()">
        {{ g.settings.colorblind ? '开' : '关' }}
      </button>
    </div>

    <div class="row spread">
      <span>关闭抖动动画</span>
      <button :class="{ 'btn-primary': g.settings.noShake }" @click="(g.settings.noShake = !g.settings.noShake), g.persistSettings()">
        {{ g.settings.noShake ? '开' : '关' }}
      </button>
    </div>

    <div class="row spread">
      <span>静音</span>
      <button :class="{ 'btn-primary': g.settings.muted }" @click="(g.settings.muted = !g.settings.muted), g.persistSettings()">
        {{ g.settings.muted ? '已静音' : '有声' }}
      </button>
    </div>

    <div class="row spread" style="gap: 12px">
      <span>音量</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        :value="g.settings.volume"
        style="flex: 1"
        @input="(e: any) => { g.settings.volume = Number(e.target.value); g.persistSettings(); }"
      />
      <span class="chip">{{ Math.round(g.settings.volume * 100) }}%</span>
    </div>

    <div class="row" style="justify-content: flex-end">
      <button class="btn-ghost" @click="g.goMenu()">完成</button>
    </div>
  </div>
</template>
