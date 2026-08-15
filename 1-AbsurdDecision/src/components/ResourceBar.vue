<script setup lang="ts">
import { useGame } from "../stores/game";
import { BAND_LABEL } from "../core/resources";
import { CONTENT } from "../data";
import type { ResourceKey } from "../core/types";

const game = useGame();

function pct(key: ResourceKey): number {
  const d = CONTENT.resources.find((r) => r.key === key)!;
  return Math.max(0, Math.min(100, (game.game!.resources[key] / d.max) * 100));
}
function bandClass(key: ResourceKey): string {
  return "band-" + game.bands[key];
}
function bandLabel(key: ResourceKey): string {
  return BAND_LABEL[game.bands[key]];
}
</script>

<template>
  <div class="resbar" v-if="game.game">
    <div
      v-for="d in CONTENT.resources"
      :key="d.key"
      class="pill"
      :class="bandClass(d.key)"
      :title="bandLabel(d.key)"
    >
      <span class="ic">{{ d.icon }}</span>
      <span class="nm">{{ d.name }}</span>
      <span class="val">{{ game.game.resources[d.key] }}</span>
      <span class="bar"><i :style="{ width: pct(d.key) + '%' }"></i></span>
      <span class="lab">{{ BAND_LABEL[game.bands[d.key]] }}</span>
    </div>
  </div>
</template>

<style scoped>
.resbar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 10px 0 14px;
}
.pill {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ic {
  font-size: 16px;
}
.nm {
  font-size: 12px;
  color: var(--muted);
}
.val {
  font-size: 20px;
  font-weight: 800;
}
.bar {
  height: 5px;
  background: #eee;
  border-radius: 3px;
  overflow: hidden;
}
.bar i {
  display: block;
  height: 100%;
  background: currentColor;
  transition: width 0.3s ease;
}
.lab {
  font-size: 11px;
  font-weight: 700;
}
</style>
