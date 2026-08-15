<script setup lang="ts">
import { computed } from 'vue'
import { useGame } from '../store'
import { nextCaseId } from '../data/cases'

const game = useGame()
const c = computed(() => game.currentCase!)

const timeline = computed(() =>
  [...c.value.truthEvents].sort((a, b) => {
    const ma = /^(\d{1,2}):(\d{2})$/.exec(a.time)
    const mb = /^(\d{1,2}):(\d{2})$/.exec(b.time)
    const na = ma ? +ma[1] * 60 + +ma[2] : 1e9
    const nb = mb ? +mb[1] * 60 + +mb[2] : 1e9
    return na - nb
  })
)

const nameOf = (id: string) => c.value.characters.find((x) => x.id === id)?.name ?? id

const outcomeClass = computed(() =>
  game.verdict?.outcome === 'success' ? 'success-text' : game.verdict?.outcome === 'partial' ? 'partial-text' : 'fail-text'
)
const endingText = computed(() => {
  const o = game.verdict?.outcome
  if (o === 'success') return c.value.ending.success
  if (o === 'partial') return c.value.ending.partial
  return c.value.ending.fail
})
const hasNext = computed(() => !!nextCaseId(c.value.id))
</script>

<template>
  <div class="col" v-if="game.currentCase && game.verdict">
    <section class="card" style="text-align: center">
      <div style="font-size: 2em">
        {{ game.verdict.outcome === 'success' ? '🎉' : game.verdict.outcome === 'partial' ? '🤔' : '💥' }}
      </div>
      <div style="font-size: 1.4em; font-weight: 800" :class="outcomeClass">
        {{ game.verdict.outcome === 'success' ? '指控成立' : game.verdict.outcome === 'partial' ? '证据不足（部分成立）' : '指控失败' }}
      </div>
      <p :class="outcomeClass" style="margin: 6px 0 0">{{ game.verdict.message }}</p>
    </section>

    <section class="card">
      <h3 style="margin: 0 0 8px">📖 真相回放</h3>
      <div class="col" style="gap: 8px">
        <div v-for="e in timeline" :key="e.id" class="bubble">
          <div class="row" style="align-items: center">
            <span class="kbd">🕒 {{ e.time }}</span>
            <span style="font-weight: 700; margin-left: 8px">{{ e.action }}</span>
            <span class="chip" style="margin-left: auto">{{ e.location }}</span>
          </div>
          <div class="fact">涉及：{{ e.actors.map(nameOf).join('、') }}</div>
          <div v-if="e.cause" class="muted" style="font-size: 0.88em; margin-top: 3px">原因：{{ e.cause }}</div>
        </div>
      </div>
    </section>

    <section class="card">
      <h3 style="margin: 0 0 8px">📝 结案评价</h3>
      <p style="margin: 0; white-space: pre-line">{{ endingText }}</p>
      <p class="fact" style="margin-top: 8px">当前声誉：{{ game.reputation }}</p>
    </section>

    <div class="row" style="justify-content: center; flex-wrap: wrap">
      <button @click="game.retryCase()">🔁 重玩本案</button>
      <button v-if="game.verdict.outcome !== 'fail' && hasNext" class="btn-primary" @click="game.nextCase()">
        下一案 →
      </button>
      <button class="btn-ghost" @click="game.toCaseSelect()">≡ 案件列表</button>
    </div>
  </div>
</template>
