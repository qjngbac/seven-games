<script setup lang="ts">
import { useGame } from "../stores/game";
import { SAVE_VERSION } from "../core/state";
const game = useGame();
</script>

<template>
  <div class="card settings">
    <h2 style="margin-top: 0">设置</h2>

    <label class="line">
      <span>音效</span>
      <input type="checkbox" :checked="game.sfxOn" @change="game.toggleSfx(($event.target as HTMLInputElement).checked)" />
    </label>

    <div class="line">
      <span>存档版本</span><span class="val">v{{ SAVE_VERSION }}</span>
    </div>

    <div class="report">
      <div class="bh">内容加载</div>
      <pre>{{ game.contentReport }}</pre>
    </div>

    <div class="row" style="margin-top: 14px">
      <button class="btn ghost" @click="game.backToMenu()">返回</button>
      <button class="btn ghost" @click="game.restart()">清空存档并回主菜单</button>
    </div>
  </div>
</template>

<style scoped>
.line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
  font-weight: 600;
}
.val {
  color: var(--muted);
}
.report {
  margin-top: 12px;
  background: #f7f5ee;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 12px;
}
.bh {
  font-weight: 700;
  font-size: 13px;
  color: var(--accent2);
  margin-bottom: 6px;
}
pre {
  margin: 0;
  white-space: pre-wrap;
  font-size: 12px;
  color: #555;
  font-family: ui-monospace, monospace;
}
</style>
