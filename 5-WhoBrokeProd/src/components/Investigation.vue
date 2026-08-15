<script setup lang="ts">
import { computed } from 'vue'
import { useGame } from '../store'

const game = useGame()

const discoveredLabels = computed(() => {
  const c = game.currentCase
  if (!c) return []
  return game.discoveredFacts.map((f) => c.factLabels?.[f] ?? f)
})

function examine(evId: string) {
  game.examineEvidence(evId)
}
</script>

<template>
  <div class="col" v-if="game.currentCase">
    <!-- 状态条 -->
    <section class="card row" style="align-items: center; flex-wrap: wrap">
      <span class="chip">提问剩余 <b>{{ game.actionsLeft }}</b> / {{ game.maxActions }}</span>
      <span class="chip">已检视证据 {{ game.examinedEvidence.length }} / {{ game.currentCase.evidence.length }}</span>
      <span class="chip">已发现事实 {{ game.discoveredFacts.length }}</span>
      <span class="spacer" style="flex: 1"></span>
      <button @click="game.openBoard()">🧩 推理板</button>
      <button class="btn-primary" @click="game.openAccusation()">⚖ 提出指控</button>
    </section>

    <div class="grid grid-2">
      <!-- 人物 -->
      <section class="card">
        <h3 style="margin: 0 0 8px">👥 询问对象</h3>
        <div class="col" style="gap: 8px">
          <button
            v-for="ch in game.currentCase.characters"
            :key="ch.id"
            class="row"
            style="align-items: center; text-align: left; justify-content: flex-start"
            @click="game.openDialogue(ch.id)"
          >
            <span style="font-size: 1.5em">{{ ch.avatar }}</span>
            <div>
              <div style="font-weight: 700">{{ ch.name }} <span class="fact">· {{ ch.role }}</span></div>
              <div class="muted" style="font-size: 0.82em">{{ ch.blurb }}</div>
            </div>
          </button>
        </div>
      </section>

      <!-- 证据 -->
      <section class="card">
        <h3 style="margin: 0 0 8px">🗂 证据与记录（点击检视）</h3>
        <div class="col" style="gap: 8px">
          <button
            v-for="ev in game.currentCase.evidence"
            :key="ev.id"
            class="row evidence-item"
            style="text-align: left; align-items: flex-start; justify-content: flex-start"
            @click="examine(ev.id)"
          >
            <div style="flex: 1">
              <div style="font-weight: 700">
                {{ ev.name }}
                <span v-if="game.examinedEvidence.includes(ev.id)" class="chip ok" style="margin-left: 6px">已检视</span>
              </div>
              <div class="fact">来源：{{ ev.source }} · 可信度 {{ Math.round(ev.reliability * 100) }}%</div>
              <div class="muted" style="font-size: 0.85em; margin-top: 3px">{{ ev.desc }}</div>
            </div>
          </button>
        </div>
      </section>
    </div>

    <!-- 已发现事实 -->
    <section class="card">
      <h3 style="margin: 0 0 8px">🔎 已发现的事实</h3>
      <div v-if="discoveredLabels.length === 0" class="muted">还没有发现任何事实。检视证据，或去询问嫌疑人。</div>
      <div v-else class="grid grid-4">
        <span v-for="(l, i) in discoveredLabels" :key="i" class="chip">{{ l }}</span>
      </div>
      <p class="hint" style="margin-top: 10px">
        在对话中向嫌疑人出示证据，可逼出与公开说法矛盾的真话，并解锁新话题。推理板上把互斥事实连成「矛盾」即可识别谎言。
      </p>
    </section>
  </div>
</template>
