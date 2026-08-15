<script setup lang="ts">
import { onMounted, onUnmounted, computed } from "vue";
import { useGame } from "../stores/game";
import { CONTENT } from "../data";
import type { ResourceKey } from "../core/types";

const game = useGame();

const chips = computed(() => {
  const r = game.result;
  if (!r) return [];
  return (Object.keys(r.delta) as ResourceKey[])
    .map((k) => ({ k, v: r.delta[k] ?? 0 }))
    .filter((x) => x.v !== 0)
    .map((x) => {
      const d = CONTENT.resources.find((res) => res.key === x.k)!;
      return { icon: d.icon, name: d.name, v: x.v };
    });
});

function onKey(e: KeyboardEvent) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    game.advanceFromResult();
  }
}
onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <div class="card result" v-if="game.result">
    <div class="rh">结果</div>
    <div class="rchoice">你选择了：{{ game.result.choiceText }}</div>
    <p class="rtext">{{ game.result.resultText }}</p>

    <div class="chips" v-if="chips.length">
      <span v-for="c in chips" :key="c.name" class="chip" :class="c.v > 0 ? 'up' : 'down'">
        {{ c.icon }} {{ c.name }} {{ c.v > 0 ? "+" : "" }}{{ c.v }}
      </span>
    </div>
    <div class="chips" v-else>
      <span class="chip flat">数值暂未变化</span>
    </div>

    <div class="delay" v-if="game.result.delayedScheduled">
      ⏳ 后续：{{ game.result.delayedNote }}
    </div>

    <div class="row" style="justify-content: flex-end; margin-top: 14px">
      <button class="btn" @click="game.advanceFromResult()">继续 (Enter)</button>
    </div>
  </div>
</template>

<style scoped>
.rh {
  color: var(--accent2);
  font-weight: 700;
  font-size: 13px;
}
.rchoice {
  font-weight: 700;
  margin: 4px 0 8px;
}
.rtext {
  line-height: 1.7;
  color: #3a3a3a;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.chip {
  border-radius: 20px;
  padding: 6px 12px;
  font-weight: 700;
  font-size: 14px;
}
.chip.up {
  background: #e7f7ee;
  color: var(--good);
}
.chip.down {
  background: #fdecea;
  color: var(--crit);
}
.chip.flat {
  background: #f0eee8;
  color: var(--muted);
}
.delay {
  margin-top: 12px;
  background: #fff8ef;
  border: 1px dashed var(--warn);
  border-radius: 10px;
  padding: 10px;
  font-size: 13px;
}
</style>
