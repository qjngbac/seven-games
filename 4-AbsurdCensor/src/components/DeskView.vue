<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useGame } from '../store'
import DocumentCard from './DocumentCard.vue'
import { Decision } from '../game/types'
import { FIRE_PRESSURE } from '../game/narrative'

const game = useGame()
const selectedDoc = ref<string | null>(null)

const case_ = computed(() => game.currentCase)
const isFeedback = computed(() => game.phase === 'feedback')

// 压力条按"停职红线"归一化（阈值唯一来源见 game/narrative.ts）
const pressurePct = computed(() => Math.min(100, Math.round((game.cum.orgPressure / FIRE_PRESSURE) * 100)))

function selectDoc(id: string) {
  selectedDoc.value = id
}
function stamp(d: Decision) {
  if (isFeedback.value) return
  game.doDecide(d)
}
function next() {
  game.afterFeedback()
}

// 换申请者时重置选中文件，避免旧 id 残留
watch(case_, () => {
  selectedDoc.value = null
})

function cycleDoc(dir: 1 | -1) {
  const docs = case_.value?.documents ?? []
  if (docs.length === 0) return
  const idx = docs.findIndex((d) => d.id === selectedDoc.value)
  const next = idx < 0 ? 0 : (idx + dir + docs.length) % docs.length
  selectedDoc.value = docs[next].id
}

function onKey(e: KeyboardEvent) {
  if (game.phase !== 'desk' && game.phase !== 'feedback') return
  if (game.phase === 'feedback') {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      next()
    }
    return
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    cycleDoc(-1)
    return
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    cycleDoc(1)
    return
  }
  // 带 Ctrl/Alt/Meta 的组合键（如 Ctrl+S 保存网页）不触发盖章
  if (e.ctrlKey || e.metaKey || e.altKey) return
  if (e.key === 'a' || e.key === 'A') stamp('allow')
  else if (e.key === 'd' || e.key === 'D') stamp('deny')
  else if (e.key === 's' || e.key === 'S') stamp('detain')
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

const reasons = computed(() => game.lastReasons)
const feedbackTitle = computed(() => {
  const o = game.lastOutcome
  if (!o) return ''
  if (o.isWrongAllow) return '❌ 错误放行'
  if (o.isWrongDeny) return '❌ 错误拒绝'
  if (o.decision === 'detain') return '⏸ 暂扣调查'
  return '✅ 合法裁定'
})
</script>

<template>
  <div class="desk scroll">
    <!-- HUD -->
    <header class="hud">
      <div><strong>{{ game.currentScene?.icon }} {{ game.currentScene?.name }} · {{ game.currentDay?.title }}</strong></div>
      <div class="muted">进度 {{ game.progress.done }}/{{ game.progress.total }}</div>
      <div style="flex: 1; display: flex; align-items: center; gap: 10px">
        <span class="muted" style="font-size: 12px">组织压力</span>
        <div class="bar"><div class="bar-fill" :style="{ width: pressurePct + '%' }" /></div>
      </div>
      <div :style="{ color: game.cum.conscience >= 0 ? 'var(--ok)' : 'var(--danger)', fontWeight: 700 }">
        良心 {{ game.cum.conscience >= 0 ? '+' : '' }}{{ game.cum.conscience }}
      </div>
    </header>

    <div class="cols">
      <!-- 申请者 -->
      <section class="col applicant">
        <div class="card" style="height: 100%">
          <div style="font-size: 54px; text-align: center">{{ case_?.portrait }}</div>
          <h2 style="text-align: center">{{ case_?.name }}</h2>
          <p class="muted" style="font-style: italic; line-height: 1.7">“{{ case_?.statement }}”</p>
          <div style="margin-top: 10px">
            <span class="muted" style="font-size: 12px">携带：</span>
            <span v-for="it in case_?.items" :key="it" class="chip">{{ it }}</span>
          </div>
          <div v-if="case_?.moral" class="hint">
            💭 {{ case_?.moral.hint }}
          </div>
        </div>
      </section>

      <!-- 文件 -->
      <section class="col docs">
        <p class="muted" style="margin: 0 0 8px">📂 提交的文件（点击查看，再点「核验真伪」查证据）</p>
        <DocumentCard
          v-for="d in case_?.documents"
          :key="d.id"
          :doc="d"
          :selected="selectedDoc === d.id"
          @select="selectDoc(d.id)"
        />
        <p v-if="!case_?.documents?.length" class="muted">（该申请者未提交任何文件）</p>
      </section>

      <!-- 规则书 -->
      <section class="col rules">
        <p class="muted" style="margin: 0 0 8px">📜 今日规则</p>
        <div
          v-for="r in game.currentRules"
          :key="r.id"
          class="rule"
          :class="{ 'rule-new': game.currentDay?.isNew?.includes(r.id) }"
        >
          <span v-if="game.currentDay?.isNew?.includes(r.id)" class="tag-new">［新］</span>
          {{ r.explain }}
        </div>
      </section>
    </div>

    <!-- 印章 -->
    <footer class="stamps">
      <button class="stamp-allow" :disabled="isFeedback" @click="stamp('allow')">✓ 放行 (A)</button>
      <button class="stamp-detain" :disabled="isFeedback" @click="stamp('detain')">⏸ 暂扣 (S)</button>
      <button class="stamp-deny" :disabled="isFeedback" @click="stamp('deny')">✕ 拒绝 (D)</button>
    </footer>

    <!-- 即时反馈覆盖层 -->
    <div v-if="isFeedback" class="overlay">
      <div class="card feedback">
        <h2 :style="{ color: game.lastOutcome?.isWrongAllow || game.lastOutcome?.isWrongDeny ? 'var(--danger)' : 'var(--ok)' }">
          {{ feedbackTitle }}
        </h2>
        <p class="muted">
          你的裁定：<strong>{{ game.lastOutcome?.decision === 'allow' ? '放行' : game.lastOutcome?.decision === 'deny' ? '拒绝' : '暂扣' }}</strong>
          ｜ 制度合法裁决：<strong>{{ game.lastOutcome?.expected === 'allow' ? '放行' : '拒绝' }}</strong>
        </p>

        <div style="margin: 10px 0; line-height: 1.7">
          <div v-for="(rs, i) in reasons" :key="i" :style="{ color: rs.kind === 'violation' ? 'var(--danger)' : rs.kind === 'exception' ? 'var(--accent)' : 'var(--ink-dim)' }">
            {{ rs.kind === 'violation' ? '✗' : rs.kind === 'exception' ? '★' : '·' }} {{ rs.text }}
          </div>
        </div>

        <div class="truth">🔎 真相：{{ game.lastCase?.truth }}</div>

        <button class="btn-primary" style="margin-top: 14px; width: 100%" @click="next">
          {{ game.desk?.finished ? '完成今日 →' : '下一位 →' }} (Enter)
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.desk {
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 14px 18px;
  gap: 12px;
}
.hud {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 16px;
}
.bar {
  flex: 1;
  height: 10px;
  background: var(--panel-2);
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid var(--line);
}
.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--stamp-detain), var(--danger));
  transition: width 0.3s;
}
.cols {
  flex: 1;
  display: grid;
  grid-template-columns: 280px 1fr 300px;
  gap: 14px;
  min-height: 0;
}
.col {
  min-height: 0;
  overflow-y: auto;
}
.applicant .hint {
  margin-top: 14px;
  background: var(--panel-2);
  border-left: 3px solid var(--accent);
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--ink-dim);
}
.docs {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rules .rule {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 1.5;
}
.rules .rule-new {
  border-color: var(--rule-new);
}
.stamps {
  display: flex;
  gap: 12px;
  justify-content: center;
}
.stamps button {
  min-width: 150px;
  font-size: 17px;
}
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(8, 11, 15, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.feedback {
  max-width: 520px;
  width: 90%;
}
.truth {
  background: var(--panel-2);
  border-left: 3px solid var(--stamp-detain);
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
}
</style>
