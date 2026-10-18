<script setup lang="ts">
import { computed } from 'vue'
import { useGame } from '../store'
import { norm, canonicalTimeForAction } from '../case-model/claim-validator'
import { getActionOptionsForCase, type ActionOption } from '../case-model/actions'

const game = useGame()

const c = computed(() => game.currentCase!)

// 动机预设，降低输入负担
const MOTIVE_PRESETS = [
  '为赶上线进度绕过流程',
  '误操作未复核确认',
  '避免告警扩散而擅自处理',
  '图省事擅自简化测试',
  '测试与生产环境混淆'
]

// 行为选项：规范中文表述（标准英文术语保留括号中）+ 互斥高拟真干扰项，杜绝重复同义词与代码变量暴露
const actionOptions = computed<ActionOption[]>(() => (c.value ? getActionOptionsForCase(c.value) : []))

function isActionSelected(opt: ActionOption): boolean {
  const current = game.accusation.action
  if (!current) return false
  return current === opt.value || norm(current) === norm(opt.value) || norm(current) === norm(opt.label)
}

const suggestedTime = computed(() => (c.value ? canonicalTimeForAction(c.value, game.accusation.action) : undefined))
const truthTimes = computed(() => (c.value ? [...new Set(c.value.truthEvents.map((e) => e.time))] : []))

function setAction(opt: ActionOption) {
  game.setAccusationField('action', opt.value)
  // 若未填写时间且有推荐时间，自动带入
  if (!game.accusation.time && c.value) {
    const rec = canonicalTimeForAction(c.value, opt.value)
    if (rec) game.setAccusationField('time', rec)
  }
}
function setTime(t: string) {
  game.setAccusationField('time', t)
}
function setMotive(m: string) {
  game.setAccusationField('motive', m)
}

const canSubmit = computed(
  () =>
    game.accusation.actors.length > 0 &&
    game.accusation.action.length > 0 &&
    game.accusation.time.length > 0 &&
    game.accusation.motive.trim().length > 0 &&
    game.accusation.evidence.length > 0
)
</script>

<template>
  <div class="col" v-if="game.currentCase">
    <section class="card row" style="align-items: center">
      <span style="font-size: 1.6em">⚖</span>
      <div><div style="font-weight: 800">提出指控</div><div class="fact">提交完整事件链：责任人、危险行为、时间、动机与证据。</div></div>
      <span class="spacer" style="flex: 1"></span>
      <button class="btn-ghost" @click="game.openBoard()">🧩 推理板</button>
      <button class="btn-ghost" @click="game.beginInvestigation()">← 调查中心</button>
    </section>

    <!-- 责任人 -->
    <section class="card">
      <h3 style="margin: 0 0 8px">👤 责任人（可指认多人）</h3>
      <div class="row" style="flex-wrap: wrap; gap: 8px">
        <button
          v-for="ch in c.characters"
          :key="ch.id"
          :class="{ 'btn-primary': game.accusation.actors.includes(ch.id) }"
          @click="game.toggleAccusationActor(ch.id)"
        >
          {{ ch.avatar }} {{ ch.name }}
        </button>
      </div>
    </section>

    <!-- 行为 -->
    <section class="card">
      <h3 style="margin: 0 0 8px">⚡ 危险行为</h3>
      <div class="grid grid-2">
        <button
          v-for="opt in actionOptions"
          :key="opt.value"
          :class="{ 'btn-primary': isActionSelected(opt) }"
          @click="setAction(opt)"
        >
          {{ opt.label }}
        </button>
      </div>
      <p class="fact" style="margin-top: 8px">选择你认为真正造成事故的那一步操作。</p>
    </section>

    <!-- 时间 + 动机 -->
    <section class="grid grid-2">
      <div class="card">
        <h3 style="margin: 0 0 8px">🕒 案发时间</h3>
        <input
          :value="game.accusation.time"
          @input="setTime(($event.target as HTMLInputElement).value)"
          placeholder="HH:MM，如 03:02"
          style="width: 100%; background: var(--bg-soft); color: var(--text); border: 1px solid var(--line); border-radius: 10px; padding: 9px; font-family: inherit"
        />
        <div class="row" style="gap: 6px; margin-top: 8px; flex-wrap: wrap; align-items: center">
          <span class="fact" style="font-size: 0.85em">快捷填入：</span>
          <button
            v-if="suggestedTime"
            type="button"
            class="chip ok"
            style="cursor: pointer"
            @click="setTime(suggestedTime)"
          >
            推荐: {{ suggestedTime }}
          </button>
          <button
            v-for="t in truthTimes.slice(0, 4)"
            :key="t"
            type="button"
            class="chip"
            style="cursor: pointer"
            @click="setTime(t)"
          >
            {{ t }}
          </button>
        </div>
        <p class="fact" style="margin-top: 6px">根据证据里的时间戳推断案发时间，容差内均算对。</p>
      </div>
      <div class="card">
        <h3 style="margin: 0 0 8px">💡 动机</h3>
        <textarea
          :value="game.accusation.motive"
          @input="setMotive(($event.target as HTMLTextAreaElement).value)"
          rows="2"
          placeholder="他为什么这么做？可点选下方快捷动机"
          style="width: 100%; background: var(--bg-soft); color: var(--text); border: 1px solid var(--line); border-radius: 10px; padding: 9px; font-family: inherit"
        ></textarea>
        <div class="row" style="gap: 6px; margin-top: 8px; flex-wrap: wrap; align-items: center">
          <span class="fact" style="font-size: 0.85em">快捷动机：</span>
          <button
            v-for="m in MOTIVE_PRESETS"
            :key="m"
            type="button"
            class="chip"
            style="cursor: pointer"
            @click="setMotive(m)"
          >
            {{ m }}
          </button>
        </div>
      </div>
    </section>

    <!-- 证据 -->
    <section class="card">
      <h3 style="margin: 0 0 8px">🗂 引用的证据（勾选你用来支撑指控的记录）</h3>
      <div class="grid grid-2">
        <button
          v-for="ev in c.evidence"
          :key="ev.id"
          class="row evidence-item"
          style="text-align: left; align-items: center; justify-content: flex-start"
          :class="{ 'btn-primary': game.accusation.evidence.includes(ev.id) }"
          :disabled="!game.examinedEvidence.includes(ev.id)"
          @click="game.toggleAccusationEvidence(ev.id)"
        >
          <span style="flex: 1">{{ ev.name }}</span>
          <span v-if="!game.examinedEvidence.includes(ev.id)" class="chip">未检视</span>
          <span v-else-if="game.accusation.evidence.includes(ev.id)" class="chip ok">已引用</span>
          <span v-else class="chip">引用</span>
        </button>
      </div>
    </section>

    <div class="row" style="justify-content: space-between">
      <button class="btn-ghost" @click="game.beginInvestigation()">← 继续调查</button>
      <button class="btn-primary" :disabled="!canSubmit" @click="game.submitAccusation()">提交指控 ⚖</button>
    </div>
    <p v-if="!canSubmit" class="hint">请完整填写责任人、行为、时间、动机，并至少引用一项已检视的证据。</p>
  </div>
</template>
