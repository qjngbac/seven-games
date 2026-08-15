<script setup lang="ts">
import { useGame, CASES } from '../store'

const game = useGame()

function statusOf(id: string): string {
  const v = game.verdicts[id]
  if (v === 'success') return '已破案'
  if (v === 'partial') return '部分成立'
  if (v === 'fail') return '曾指控失败'
  return '未开始'
}
</script>

<template>
  <div class="col">
    <section class="title-screen card">
      <div class="big">谁动了生产环境</div>
      <p class="muted">多人对话推理 · 比对证词与客观记录，重建事件链，作出指控。</p>
      <p class="hint">
        提示：关键证据（日志、记录）可直接检视，永远不会因为提问顺序而错过；角色的话未必诚实，出示证据才能逼出真相。
      </p>
      <div class="row" style="justify-content: center; margin-top: 12px">
        <button class="btn-danger btn-ghost" @click="game.newGame()">🆕 新游戏（清空进度）</button>
      </div>
    </section>

    <section class="grid grid-2">
      <article
        v-for="c in CASES"
        :key="c.id"
        class="card"
        style="display: flex; flex-direction: column; gap: 10px; cursor: pointer"
        @click="game.selectCase(c.id)"
      >
        <div class="row" style="align-items: center">
          <span style="font-size: 1.6em">{{ c.characters[0]?.avatar ?? '🕵️' }}</span>
          <div>
            <div style="font-weight: 700">第 {{ c.chapter }} 章 · {{ c.title }}</div>
            <div class="fact">嫌疑人：{{ c.characters.map((x) => x.name).join('、') }}</div>
          </div>
          <span class="spacer" style="flex: 1"></span>
          <span class="chip" :class="{ ok: game.verdicts[c.id] === 'success' }">{{ statusOf(c.id) }}</span>
        </div>
        <p class="muted" style="margin: 0; font-size: 0.92em">{{ c.brief.split('\n')[0] }}</p>
        <button class="btn-primary" @click.stop="game.selectCase(c.id)">
          {{ game.verdicts[c.id] ? '重玩' : '开始调查' }}
        </button>
      </article>
    </section>
  </div>
</template>
