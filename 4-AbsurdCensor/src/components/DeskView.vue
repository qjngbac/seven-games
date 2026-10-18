<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useGame } from '../store'
import DocumentCard from './DocumentCard.vue'
import HistoryModal from './HistoryModal.vue'
import { Decision } from '../game/types'
import { FIRE_PRESSURE } from '../game/narrative'

const game = useGame()
const selectedDoc = ref<string | null>(null)
const showHistory = ref(false)

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

function goLobby(): void {
  window.location.href = '../../index.html'
}

function isNightArrival(time?: string): boolean {
  if (!time) return case_.value?.person?.slot === 'night'
  const [h] = time.split(':').map(Number)
  return h >= 22 || h < 6
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
  if (showHistory.value) return
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
  if (o.isCorrectDetain) return '🎯 成功查获并暂扣！'
  if (o.isWrongDetain) return '⚠️ 滥用职权（错误暂扣守法人员）'
  if (o.isWrongAllow) return o.expected === 'detain' ? '🚨 严重失职：违规放行了通缉/伪造分子！' : '❌ 违规放行（材料不合规）'
  if (o.isWrongDeny) return o.expected === 'detain' ? '🚨 严重失职：放跑了通缉/伪造分子！' : '❌ 错误拒绝（合规人员遭误拒）'
  if (o.decision === 'detain') return '⏸ 暂扣调查'
  return '✅ 合法合规裁定'
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
      <button class="btn-history" title="查看过往裁决卷宗与档案" @click="showHistory = true">
        📁 执勤档案 ({{ game.history.length }})
      </button>
      <button class="btn-history" title="返回主菜单" @click="game.toMenu()">
        ≡ 菜单
      </button>
      <button class="btn-history" title="返回七款小游戏大厅" @click="goLobby()">
        🏠 大厅
      </button>
    </header>

    <div class="cols">
      <!-- 申请者 -->
      <section class="col applicant">
        <div class="card" style="height: 100%; display: flex; flex-direction: column">
          <div style="font-size: 54px; text-align: center">{{ case_?.portrait }}</div>
          <h2 style="text-align: center; margin: 4px 0 8px">{{ case_?.name }}</h2>

          <!-- 抵达时间时钟标牌 -->
          <div class="arrival-time-card" :class="isNightArrival(case_?.arrivalTime) ? 'time-night' : 'time-day'">
            <div class="time-header">
              <span>{{ isNightArrival(case_?.arrivalTime) ? '🌙 窗口登记时间' : '☀️ 窗口登记时间' }}</span>
              <span class="curfew-pill" :class="isNightArrival(case_?.arrivalTime) ? 'pill-curfew' : 'pill-daylight'">
                {{ isNightArrival(case_?.arrivalTime) ? '宵禁管制时段 22:00-06:00' : '白昼常规通行时段' }}
              </span>
            </div>
            <div class="time-val">⏰ {{ case_?.arrivalTime || (case_?.person?.slot === 'night' ? '23:40' : '14:20') }}</div>
          </div>

          <p class="muted" style="font-style: italic; line-height: 1.7; margin: 10px 0">“{{ case_?.statement }}”</p>
          <div style="margin-top: 4px">
            <span class="muted" style="font-size: 12px">携带：</span>
            <span v-for="it in case_?.items" :key="it" class="chip">{{ it }}</span>
          </div>
          <div v-if="case_?.moral" class="hint" style="margin-top: auto">
            💭 {{ case_?.moral.hint }}
          </div>
        </div>
      </section>

      <!-- 文件 -->
      <section class="col docs">
        <p class="muted" style="margin: 0 0 8px">📂 提交的文件（点击查看，再点「核验真伪」查公文印信）</p>
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
        <h2 :style="{ color: game.lastOutcome?.isWrongAllow || game.lastOutcome?.isWrongDeny || game.lastOutcome?.isWrongDetain ? 'var(--danger)' : game.lastOutcome?.isCorrectDetain ? '#c084fc' : 'var(--ok)' }">
          {{ feedbackTitle }}
        </h2>
        <p class="muted">
          你的裁定：<strong>{{ game.lastOutcome?.decision === 'allow' ? '放行' : game.lastOutcome?.decision === 'deny' ? '拒绝' : '暂扣' }}</strong>
          ｜ 制度法定裁决：<strong>{{ game.lastOutcome?.expected === 'allow' ? '放行' : game.lastOutcome?.expected === 'detain' ? '暂扣' : '拒绝' }}</strong>
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

    <!-- 历史记录档案弹窗 -->
    <HistoryModal v-if="showHistory" @close="showHistory = false" />
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
.btn-history {
  background: var(--panel-2);
  border: 1px solid var(--line);
  color: var(--ink);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.btn-history:hover {
  border-color: var(--accent);
  color: #fff;
  background: rgba(59, 130, 246, 0.15);
}

.arrival-time-card {
  margin: 6px 0 10px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.arrival-time-card.time-night {
  background: linear-gradient(135deg, rgba(30, 27, 75, 0.6), rgba(15, 23, 42, 0.8));
  border-color: rgba(129, 140, 248, 0.4);
}
.arrival-time-card.time-day {
  background: linear-gradient(135deg, rgba(254, 240, 138, 0.08), rgba(253, 224, 71, 0.03));
  border-color: rgba(234, 179, 8, 0.3);
}
.time-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: var(--ink-dim);
}
.curfew-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
}
.pill-curfew {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.4);
}
.pill-daylight {
  background: rgba(34, 197, 94, 0.15);
  color: var(--ok);
  border: 1px solid rgba(34, 197, 94, 0.3);
}
.time-val {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: var(--ink);
}
.time-night .time-val {
  color: #c7d2fe;
}
.time-day .time-val {
  color: #fef08a;
}
</style>
