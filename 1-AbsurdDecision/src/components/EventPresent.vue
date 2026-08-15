<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useGame } from "../stores/game";
import { CONTENT } from "../data";
import { choiceAvailable } from "../core/eventSelector";
import type { ChoiceDef } from "../core/types";

const game = useGame();

function avail(c: ChoiceDef): boolean {
  return game.game ? choiceAvailable(c, game.game, CONTENT) : true;
}
function pick(c: ChoiceDef) {
  if (avail(c)) game.chooseChoice(c.id);
}

function onKey(e: KeyboardEvent) {
  const idx = "123456789".indexOf(e.key);
  if (idx >= 0 && game.event && idx < game.event.choices.length) {
    const c = game.event.choices[idx];
    if (avail(c)) {
      e.preventDefault();
      pick(c);
    }
  }
}
onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <div class="card event" v-if="game.event">
    <div class="cat"># {{ game.event.category }}</div>
    <h2 class="etitle">{{ game.event.title }}</h2>
    <p class="ebody">{{ game.event.body }}</p>

    <div class="clues" v-if="game.event.clues && game.event.clues.length">
      <div class="clue-h">线索</div>
      <ul>
        <li v-for="(c, i) in game.event.clues" :key="i">{{ c }}</li>
      </ul>
    </div>

    <div class="choices">
      <button
        v-for="(c, i) in game.event.choices"
        :key="c.id"
        class="choice"
        :class="{ disabled: !avail(c) }"
        :disabled="!avail(c)"
        @click="pick(c)"
      >
        <span class="key">{{ i + 1 }}</span>
        <span class="ctext">{{ c.text }}</span>
        <span class="lock" v-if="!avail(c)">🔒 条件不满足</span>
      </button>
    </div>
    <div class="hint">按键 1 / 2 / 3 快速选择</div>
  </div>
</template>

<style scoped>
.cat {
  color: var(--accent2);
  font-weight: 700;
  font-size: 13px;
}
.etitle {
  margin: 4px 0 8px;
  font-size: 22px;
}
.ebody {
  line-height: 1.7;
  color: #3a3a3a;
}
.clues {
  background: #f6f8ff;
  border: 1px solid #dde6ff;
  border-radius: 10px;
  padding: 10px 14px;
  margin: 12px 0;
}
.clue-h {
  font-weight: 700;
  font-size: 13px;
  color: var(--accent2);
}
.clues ul {
  margin: 6px 0 0;
  padding-left: 18px;
  font-size: 13px;
  color: #444;
}
.choices {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}
.choice {
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px;
  font-size: 15px;
  transition: transform 0.08s ease, border-color 0.12s ease, background 0.12s ease;
}
.choice:hover:not(.disabled) {
  border-color: var(--accent);
  background: #fffaf6;
  transform: translateX(2px);
}
.choice:active:not(.disabled) {
  transform: translateY(1px);
}
.choice.disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.key {
  flex: 0 0 26px;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: var(--accent);
  color: #fff;
  font-weight: 800;
  display: grid;
  place-items: center;
  font-size: 14px;
}
.choice.disabled .key {
  background: #cfc9bb;
}
.ctext {
  flex: 1;
}
.lock {
  font-size: 12px;
  color: var(--crit);
}
.hint {
  text-align: center;
  color: var(--muted);
  font-size: 12px;
  margin-top: 10px;
}
</style>
