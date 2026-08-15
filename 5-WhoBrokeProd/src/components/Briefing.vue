<script setup lang="ts">
import { useGame } from '../store'

const game = useGame()
</script>

<template>
  <div class="col" v-if="game.currentCase">
    <section class="card">
      <div class="row" style="align-items: center">
        <span style="font-size: 2em">📂</span>
        <div>
          <div style="font-size: 1.3em; font-weight: 800">第 {{ game.currentCase.chapter }} 章 · {{ game.currentCase.title }}</div>
          <div class="fact">提问预算：{{ game.maxActions }} 次 · 证据可直接检视，不消耗提问</div>
        </div>
      </div>
    </section>

    <section class="card">
      <h3 style="margin: 0 0 8px">📜 开场</h3>
      <p style="margin: 0">{{ game.currentCase.intro }}</p>
    </section>

    <section class="card">
      <h3 style="margin: 0 0 8px">🎯 案件目标与已知事实</h3>
      <p style="margin: 0; white-space: pre-line">{{ game.currentCase.brief }}</p>
    </section>

    <section class="card">
      <h3 style="margin: 0 0 8px">👥 涉案人员</h3>
      <div class="grid grid-4">
        <div v-for="ch in game.currentCase.characters" :key="ch.id" class="bubble">
          <div style="font-size: 1.6em">{{ ch.avatar }}</div>
          <div style="font-weight: 700">{{ ch.name }}</div>
          <div class="fact">{{ ch.role }}</div>
          <div class="muted" style="font-size: 0.85em; margin-top: 4px">{{ ch.blurb }}</div>
        </div>
      </div>
    </section>

    <div class="row" style="justify-content: flex-end">
      <button class="btn-primary" @click="game.beginInvestigation()">进入调查中心 →</button>
    </div>
  </div>
</template>
