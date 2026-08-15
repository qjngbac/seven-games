<script setup lang="ts">
import { computed } from "vue";
import { useGame } from "../game/store";
import { describeConstraint } from "../logic/explainer";

const game = useGame();
const puzzle = computed(() => game.puzzle!);
const rules = computed(() => puzzle.value.constraints.map((c) => describeConstraint(puzzle.value, c)));
</script>

<template>
  <div>
    <div class="topbar">
      <button class="btn small ghost" @click="game.openChapters()">← 章节</button>
      <h1 style="font-size: 1.05rem">{{ puzzle.title }}</h1>
      <span style="width: 64px"></span>
    </div>

    <div class="card">
      <div class="muted" style="font-size: 0.9rem; line-height: 1.6">{{ puzzle.scene }}</div>
      <div v-if="puzzle.mechanic" class="chip" style="margin-top: 8px; display: inline-block">
        本关机制：{{ puzzle.mechanic }}
      </div>
    </div>

    <div class="card">
      <div style="font-weight: 700; margin-bottom: 8px">📜 本关规则（公开、可推）</div>
      <ul style="margin: 0; padding-left: 20px; line-height: 1.8">
        <li v-for="(r, i) in rules" :key="i">{{ r }}</li>
      </ul>
      <div class="muted" style="margin-top: 8px; font-size: 0.85rem">
        共 {{ puzzle.characters.length }} 名角色、{{ puzzle.statements.length }} 条陈述。
        所有身份与真假都由上述规则唯一确定。
      </div>
    </div>

    <div class="card">
      <div style="font-weight: 700; margin-bottom: 8px">🧑‍🤝‍🧑 登场角色</div>
      <div v-for="c in puzzle.characters" :key="c.id" class="char-card">
        <div class="char-avatar">{{ c.name.slice(0, 1) }}</div>
        <div>
          <div style="font-weight: 700">{{ c.name }}</div>
          <div class="muted" style="font-size: 0.82rem">{{ c.blurb }}</div>
        </div>
      </div>
    </div>

    <div class="row" style="justify-content: center">
      <button class="btn primary" @click="game.beginPlay()">开始推理 ▶</button>
    </div>
  </div>
</template>
