<script setup lang="ts">
import { useGame } from '../store'

const game = useGame()
const emit = defineEmits<{ close: [] }>()

function close() {
  emit('close')
}
</script>

<template>
  <div
    style="position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); display: flex; align-items: center; justify-content: center; z-index: 50"
    @click.self="close"
  >
    <div class="card" style="width: min(460px, 92vw)">
      <h3 style="margin: 0 0 12px">⚙ 设置 / 无障碍</h3>

      <div class="col" style="gap: 14px">
        <label class="row" style="align-items: center; justify-content: space-between">
          <span>基础字号 <b>{{ game.settings.fontSize }}px</b></span>
          <input
            type="range"
            min="13"
            max="22"
            :value="game.settings.fontSize"
            @input="game.applySettings({ fontSize: Number(($event.target as HTMLInputElement).value) })"
          />
        </label>

        <label class="row" style="align-items: center; justify-content: space-between">
          <span>色弱模式（用形状/描边区分状态）</span>
          <input type="checkbox" :checked="game.settings.colorblind" @change="game.applySettings({ colorblind: ($event.target as HTMLInputElement).checked })" />
        </label>

        <label class="row" style="align-items: center; justify-content: space-between">
          <span>关闭抖动动画</span>
          <input type="checkbox" :checked="game.settings.noShake" @change="game.applySettings({ noShake: ($event.target as HTMLInputElement).checked })" />
        </label>

        <label class="row" style="align-items: center; justify-content: space-between">
          <span>音效</span>
          <input type="checkbox" :checked="game.settings.sound" @change="game.applySettings({ sound: ($event.target as HTMLInputElement).checked })" />
        </label>
      </div>

      <div class="row" style="justify-content: space-between; margin-top: 18px">
        <button class="btn-danger btn-ghost" @click="game.clearSave()">🗑 清空存档</button>
        <button class="btn-primary" @click="close">完成</button>
      </div>
    </div>
  </div>
</template>
