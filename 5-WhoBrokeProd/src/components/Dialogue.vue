<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue'
import { useGame } from '../store'

const game = useGame()
const logEl = ref<HTMLElement | null>(null)

const char = computed(() => game.currentCase?.characters.find((c) => c.id === game.dialogueChar))
const topics = computed(() => (game.dialogueChar ? game.topicsFor(game.dialogueChar) : []))
const examinedEvidence = computed(() =>
  (game.currentCase?.evidence ?? []).filter((e) => game.examinedEvidence.includes(e.id))
)
const presentedHere = computed(() =>
  game.dialogueChar ? game.presentedEvidence[game.dialogueChar] ?? [] : []
)

function ask(topicId: string) {
  if (!game.dialogueChar) return
  game.askTopic(game.dialogueChar, topicId)
  scrollDown()
}
function present(evId: string) {
  if (!game.dialogueChar) return
  game.presentEvidenceInDialogue(game.dialogueChar, evId)
  scrollDown()
}

function scrollDown() {
  nextTick(() => {
    if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight
  })
}
watch(() => game.transcript.length, scrollDown)
</script>

<template>
  <div class="col" v-if="game.currentCase && char">
    <section class="card row" style="align-items: center">
      <span style="font-size: 1.8em">{{ char.avatar }}</span>
      <div>
        <div style="font-weight: 800">{{ char.name }} <span class="fact">· {{ char.role }}</span></div>
        <div class="muted" style="font-size: 0.85em">{{ char.blurb }}</div>
      </div>
      <span class="spacer" style="flex: 1"></span>
      <button class="btn-ghost" @click="game.openBoard()">🧩 推理板</button>
      <button class="btn-ghost" @click="game.beginInvestigation()">← 调查中心</button>
    </section>

    <div class="grid grid-2">
      <!-- 话题 -->
      <section class="card">
        <h3 style="margin: 0 0 8px">💬 可询问的话题</h3>
        <div class="col" style="gap: 8px">
          <button
            v-for="s in topics"
            :key="s.topic.id"
            class="row"
            style="text-align: left; align-items: center; justify-content: flex-start"
            :disabled="!s.unlocked"
            @click="ask(s.topic.id)"
          >
            <span style="font-weight: 700">{{ s.topic.subject }}</span>
            <span v-if="!s.unlocked" class="chip" style="margin-left: auto">🔒 未解锁</span>
            <span v-else-if="(game.askedTopics[char.id] || []).includes(s.topic.id)" class="chip" style="margin-left: auto">已问</span>
          </button>
        </div>
        <p class="fact" style="margin-top: 8px">剩余提问：<b>{{ game.actionsLeft }}</b></p>
      </section>

      <!-- 出示证据 -->
      <section class="card">
        <h3 style="margin: 0 0 8px">📎 向其出示证据（不消耗提问）</h3>
        <div v-if="examinedEvidence.length === 0" class="muted">先在调查中心检视证据，才能在此出示。</div>
        <div class="col" style="gap: 8px">
          <button
            v-for="ev in examinedEvidence"
            :key="ev.id"
            class="row evidence-item"
            style="text-align: left; align-items: center; justify-content: flex-start"
            :disabled="presentedHere.includes(ev.id)"
            @click="present(ev.id)"
          >
            <span style="flex: 1">{{ ev.name }}</span>
            <span v-if="presentedHere.includes(ev.id)" class="chip ok">已出示</span>
            <span v-else class="chip">出示</span>
          </button>
        </div>
        <p class="hint" style="margin-top: 8px">出示证据后，再重问相关话题，对方可能改口说出真相。</p>
      </section>
    </div>

    <!-- 对话记录 -->
    <section class="card">
      <h3 style="margin: 0 0 8px">🗨 对话记录</h3>
      <div ref="logEl" class="col scroll" style="max-height: 320px; gap: 8px">
        <div v-for="(line, i) in game.transcript" :key="i" class="bubble" :class="{ me: line.who === '你' }">
          <div class="fact" style="margin-bottom: 2px">{{ line.who }}</div>
          <div>{{ line.text }}</div>
        </div>
        <div v-if="game.transcript.length === 0" class="muted">还没问过话。选一个话题开始吧。</div>
      </div>
    </section>

    <p v-if="game.lastError" class="fail-text">{{ game.lastError }}</p>
  </div>
</template>
