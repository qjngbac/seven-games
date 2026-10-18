<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useGame } from '../store'
import { SCENES } from '../data/scenes'
import { HistoryRecord } from '../game/types'

const emit = defineEmits<{ (e: 'close'): void }>()
const game = useGame()

// 默认进入当前所在场景档案库；若无则默认荒诞审查局
const selectedSceneId = ref<string>(
  SCENES.some((s) => s.id === game.sceneId) ? game.sceneId : SCENES[0].id
)

type SubFilterTab = 'all' | 'wrong' | 'detain'
const currentTab = ref<SubFilterTab>('all')
const confirmClear = ref(false)

// 各场景卷宗数量统计
const sceneCounts = computed(() => {
  const counts: Record<string, number> = {}
  SCENES.forEach((sc) => {
    counts[sc.id] = 0
  })
  game.history.forEach((r) => {
    if (counts[r.sceneId] !== undefined) {
      counts[r.sceneId]++
    }
  })
  return counts
})

// 当前选中的场景元信息
const currentSceneObj = computed(() => {
  if (selectedSceneId.value === 'all') return null
  return SCENES.find((s) => s.id === selectedSceneId.value) || null
})

// 当前选中场景下的卷宗列表（按场景分开）
const sceneRecords = computed(() => {
  if (selectedSceneId.value === 'all') {
    return game.history
  }
  return game.history.filter((r) => r.sceneId === selectedSceneId.value)
})

// 在场景内进一步按条件过滤（全部 / 误判 / 暂扣）
const filteredList = computed(() => {
  const list = sceneRecords.value
  if (currentTab.value === 'wrong') {
    return list.filter((r) => !r.legalCorrect)
  }
  if (currentTab.value === 'detain') {
    return list.filter((r) => r.decision === 'detain' || r.expected === 'detain')
  }
  return list
})

// 当前选定场景（或全局）专属统计数据
const stats = computed(() => {
  const list = sceneRecords.value
  const total = list.length
  const correct = list.filter((r) => r.legalCorrect).length
  const wrong = total - correct
  const detains = list.filter((r) => r.feedbackTitle.includes('成功查获') || r.decision === 'detain').length
  const totalPenalty = list.reduce((s, r) => s + (r.penalty || 0), 0)
  const rate = total > 0 ? Math.round((correct / total) * 100) : 100
  return { total, correct, wrong, detains, totalPenalty, rate }
})

// 场景天数标题映射
function getDayTitle(sceneId: string, dayDate: number): string {
  const sc = SCENES.find((s) => s.id === sceneId)
  const d = sc?.days.find((x) => x.date === dayDate)
  return d ? d.title : `第 ${dayDate} 天`
}

// 按天数分组展示卷宗（便于阅读有序的历史档案）
interface DayGroup {
  sceneId: string
  dayDate: number
  dayTitle: string
  records: HistoryRecord[]
}

const dayGroups = computed<DayGroup[]>(() => {
  const groups: DayGroup[] = []
  const map = new Map<string, DayGroup>()

  for (const rec of filteredList.value) {
    const groupKey = `${rec.sceneId}_${rec.dayDate}`
    if (!map.has(groupKey)) {
      const g: DayGroup = {
        sceneId: rec.sceneId,
        dayDate: rec.dayDate,
        dayTitle: getDayTitle(rec.sceneId, rec.dayDate),
        records: []
      }
      map.set(groupKey, g)
      groups.push(g)
    }
    map.get(groupKey)!.records.push(rec)
  }
  return groups
})

function handleClear() {
  if (selectedSceneId.value === 'all') {
    game.clearHistory()
  } else {
    game.clearSceneHistory(selectedSceneId.value)
  }
  confirmClear.value = false
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="history-overlay" @click.self="emit('close')">
    <div class="history-modal card">
      <!-- 头部 -->
      <header class="modal-header">
        <div class="modal-title">
          <span class="icon">📁</span>
          <div>
            <h2>审查看守档案 · 历史裁决卷宗</h2>
            <p class="subtitle">各场景独立归档管理 · 记录各哨位执勤履历、裁决比对与调查真相</p>
          </div>
        </div>
        <button class="btn-close" title="关闭 (Esc)" @click="emit('close')">✕</button>
      </header>

      <!-- 场景分类专柜导航栏（核心：根据场景分开存放） -->
      <div class="scene-nav-shelf">
        <div class="shelf-label">场景档案室分类存放：</div>
        <div class="scene-nav-list">
          <button
            v-for="sc in SCENES"
            :key="sc.id"
            class="scene-nav-btn"
            :class="{ active: selectedSceneId === sc.id }"
            @click="selectedSceneId = sc.id; currentTab = 'all'"
          >
            <span class="sc-icon">{{ sc.icon }}</span>
            <span class="sc-name">{{ sc.name }}</span>
            <span class="sc-count-tag" :class="{ 'has-records': (sceneCounts[sc.id] || 0) > 0 }">
              {{ sceneCounts[sc.id] || 0 }} 份
            </span>
          </button>

          <!-- 全场景总览分栏 -->
          <button
            class="scene-nav-btn all-shelf-btn"
            :class="{ active: selectedSceneId === 'all' }"
            @click="selectedSceneId = 'all'; currentTab = 'all'"
          >
            <span class="sc-icon">🗂️</span>
            <span class="sc-name">全部场景汇总</span>
            <span class="sc-count-tag" :class="{ 'has-records': game.history.length > 0 }">
              {{ game.history.length }} 份
            </span>
          </button>
        </div>
      </div>

      <!-- 当前场景归档简介与专属统计 -->
      <div class="scene-banner">
        <div class="banner-info">
          <span class="banner-title">
            {{ currentSceneObj ? currentSceneObj.icon + ' ' + currentSceneObj.name + ' · 执勤卷宗专柜' : '🗂️ 全部场景总览档案室' }}
          </span>
          <span class="banner-desc">
            {{ currentSceneObj ? currentSceneObj.blurb : '已汇集荒诞审查局、边境哨卡、机场海关与未来都市准入所有关卡卷宗' }}
          </span>
        </div>

        <!-- 场景专属统计指标 -->
        <div class="stats-pills">
          <div class="stat-pill">
            <span class="lbl">本场景审查</span>
            <span class="val">{{ stats.total }} <small>人</small></span>
          </div>
          <div class="stat-pill">
            <span class="lbl">合规率</span>
            <span class="val" :style="{ color: stats.rate >= 80 ? 'var(--ok)' : 'var(--warn)' }">
              {{ stats.rate }}%
            </span>
          </div>
          <div class="stat-pill">
            <span class="lbl">查获移交</span>
            <span class="val" style="color: #c084fc">{{ stats.detains }} <small>案</small></span>
          </div>
          <div class="stat-pill">
            <span class="lbl">误判错放</span>
            <span class="val" :style="{ color: stats.wrong > 0 ? 'var(--danger)' : 'var(--ink-dim)' }">
              {{ stats.wrong }} <small>起</small>
            </span>
          </div>
          <div class="stat-pill">
            <span class="lbl">累计罚扣</span>
            <span class="val" :style="{ color: stats.totalPenalty > 0 ? 'var(--danger)' : 'var(--ok)' }">
              -{{ stats.totalPenalty }} <small>金币</small>
            </span>
          </div>
        </div>
      </div>

      <!-- 场景内二级筛选栏 -->
      <div class="filter-bar">
        <div class="tabs">
          <button
            class="tab-btn"
            :class="{ active: currentTab === 'all' }"
            @click="currentTab = 'all'"
          >
            全部卷宗 ({{ sceneRecords.length }})
          </button>
          <button
            class="tab-btn"
            :class="{ active: currentTab === 'wrong' }"
            @click="currentTab = 'wrong'"
          >
            仅看误判 ({{ stats.wrong }})
          </button>
          <button
            class="tab-btn"
            :class="{ active: currentTab === 'detain' }"
            @click="currentTab = 'detain'"
          >
            暂扣与要犯 ({{ stats.detains }})
          </button>
        </div>

        <div class="clear-zone">
          <button
            v-if="!confirmClear"
            class="btn-clear"
            :disabled="sceneRecords.length === 0"
            @click="confirmClear = true"
          >
            🗑 清空{{ selectedSceneId === 'all' ? '全部' : '本场景' }}档案
          </button>
          <div v-else class="confirm-box">
            <span style="font-size: 12px; color: var(--danger)">
              确定清空{{ selectedSceneId === 'all' ? '全部场景' : `「${currentSceneObj?.name}」` }}卷宗？
            </span>
            <button class="btn-danger-sm" @click="handleClear">确定</button>
            <button class="btn-cancel-sm" @click="confirmClear = false">取消</button>
          </div>
        </div>
      </div>

      <!-- 卷宗列表（按天数分组分类呈现） -->
      <div class="records-container scroll">
        <div v-if="filteredList.length === 0" class="empty-state">
          <div style="font-size: 46px; margin-bottom: 8px">📂</div>
          <p class="muted" style="font-size: 15px">
            {{ currentSceneObj ? `「${currentSceneObj.name}」专柜暂无审查卷宗` : '当前筛选分类下暂无记录' }}
          </p>
          <p style="font-size: 12px; color: var(--ink-dim); max-width: 420px; margin: 6px auto 0; line-height: 1.6">
            {{ currentSceneObj ? `前往 ${currentSceneObj.name} 窗口执勤并在审阅材料后做出裁定，对应案件将分类独立存放在此档案柜。` : '在关卡窗口完成审查裁定后，档案将自动归档。' }}
          </p>
        </div>

        <div v-else class="day-groups-wrapper">
          <div v-for="group in dayGroups" :key="group.sceneId + '_' + group.dayDate" class="day-group-section">
            <div class="day-group-header">
              <span class="day-title-badge">📅 {{ group.dayTitle }}</span>
              <span class="day-count-badge">{{ group.records.length }} 份卷宗归档</span>
            </div>

            <div class="day-records-grid">
              <div
                v-for="rec in group.records"
                :key="rec.id"
                class="record-card"
                :class="{ 'is-wrong': !rec.legalCorrect, 'is-detain': rec.feedbackTitle.includes('暂扣') }"
              >
                <div class="rec-top">
                  <div class="applicant-info">
                    <span class="portrait">{{ rec.portrait }}</span>
                    <div>
                      <div class="name-line">
                        <strong class="name">{{ rec.applicantName }}</strong>
                        <span class="scene-tag">{{ rec.sceneName }} · 第{{ rec.dayDate }}天</span>
                        <span class="time-tag">⏰ {{ rec.arrivalTime }}</span>
                      </div>
                      <div class="statement muted">“{{ rec.statement }}”</div>
                    </div>
                  </div>

                  <!-- 裁定比对徽章 -->
                  <div class="verdict-box">
                    <div
                      class="status-badge"
                      :class="{
                        'badge-ok': rec.legalCorrect && !rec.feedbackTitle.includes('成功查获'),
                        'badge-catch': rec.feedbackTitle.includes('成功查获'),
                        'badge-wrong': !rec.legalCorrect
                      }"
                    >
                      {{ rec.feedbackTitle }}
                    </div>
                    <div class="compare-line">
                      <span class="v-label">你的裁定:</span>
                      <span
                        class="v-val"
                        :class="{
                          'text-allow': rec.decision === 'allow',
                          'text-deny': rec.decision === 'deny',
                          'text-detain': rec.decision === 'detain'
                        }"
                      >
                        {{ rec.decision === 'allow' ? '放行' : rec.decision === 'deny' ? '拒绝' : '暂扣' }}
                      </span>
                      <span class="v-sep">/</span>
                      <span class="v-label">法定要求:</span>
                      <span
                        class="v-val"
                        :class="{
                          'text-allow': rec.expected === 'allow',
                          'text-deny': rec.expected === 'deny',
                          'text-detain': rec.expected === 'detain'
                        }"
                      >
                        {{ rec.expected === 'allow' ? '放行' : rec.expected === 'deny' ? '拒绝' : '暂扣' }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- 真实调查报告 -->
                <div class="truth-box">
                  <span class="truth-icon">🔎</span>
                  <span class="truth-text"><b>真相揭秘：</b>{{ rec.truth }}</span>
                  <span v-if="rec.penalty > 0" class="penalty-tag">罚金 -{{ rec.penalty }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作 -->
      <footer class="modal-footer">
        <span class="muted" style="font-size: 13px">
          💡 提示：各场景档案独立分类保存；按 <b>Esc</b> 或点击关闭按钮返回执勤
        </span>
        <button class="btn-primary" @click="emit('close')">返回执勤 →</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.history-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(5px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.history-modal {
  width: 1040px;
  max-width: 96vw;
  height: 90vh;
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border: 1px solid var(--line);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.75);
  border-radius: 14px;
  overflow: hidden;
  padding: 0;
}
.modal-header {
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
  background: var(--panel-2);
}
.modal-title {
  display: flex;
  align-items: center;
  gap: 14px;
}
.modal-title .icon {
  font-size: 32px;
}
.modal-title h2 {
  margin: 0;
  font-size: 20px;
}
.modal-title .subtitle {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--ink-dim);
}
.btn-close {
  background: transparent;
  border: none;
  color: var(--ink-dim);
  font-size: 20px;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
  transition: all 0.2s;
}
.btn-close:hover {
  background: var(--line);
  color: var(--ink);
}

/* 场景分类专柜导航 */
.scene-nav-shelf {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  background: rgba(15, 23, 42, 0.65);
  border-bottom: 1px solid var(--line);
  overflow-x: auto;
  flex-shrink: 0;
}
.shelf-label {
  font-size: 12px;
  color: var(--ink-dim);
  white-space: nowrap;
  font-weight: 600;
}
.scene-nav-list {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
}
.scene-nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: var(--panel-2);
  border: 1px solid var(--line);
  color: var(--ink-dim);
  padding: 7px 13px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.18s ease;
  white-space: nowrap;
}
.scene-nav-btn:hover {
  color: var(--ink);
  border-color: var(--accent);
  background: rgba(255, 255, 255, 0.05);
}
.scene-nav-btn.active {
  background: rgba(59, 130, 246, 0.18);
  border-color: var(--accent);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.25);
}
.sc-icon {
  font-size: 15px;
}
.sc-count-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--ink-dim);
}
.sc-count-tag.has-records {
  background: rgba(59, 130, 246, 0.25);
  color: #93c5fd;
  font-weight: 600;
}
.scene-nav-btn.active .sc-count-tag.has-records {
  background: var(--accent);
  color: #fff;
}

/* 场景归档横幅与专属统计 */
.scene-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.25);
  border-bottom: 1px solid var(--line);
  flex-wrap: wrap;
}
.banner-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.banner-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}
.banner-desc {
  font-size: 12px;
  color: var(--ink-dim);
}

.stats-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.stat-pill {
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 4px 10px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 76px;
}
.stat-pill .lbl {
  font-size: 10px;
  color: var(--ink-dim);
}
.stat-pill .val {
  font-size: 15px;
  font-weight: 700;
}
.stat-pill small {
  font-size: 11px;
  font-weight: normal;
  color: var(--ink-dim);
}

/* 场景内二次筛选栏 */
.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  border-bottom: 1px solid var(--line);
  gap: 12px;
  flex-wrap: wrap;
  background: var(--panel-2);
}
.tabs {
  display: flex;
  gap: 8px;
}
.tab-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--line);
  color: var(--ink-dim);
  padding: 5px 11px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.tab-btn:hover {
  color: var(--ink);
  border-color: var(--accent);
}
.tab-btn.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
  font-weight: 600;
}
.btn-clear {
  background: transparent;
  border: 1px solid var(--line);
  color: var(--ink-dim);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-clear:hover:not(:disabled) {
  border-color: var(--danger);
  color: var(--danger);
  background: rgba(239, 68, 68, 0.08);
}
.btn-clear:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.confirm-box {
  display: flex;
  align-items: center;
  gap: 6px;
}
.btn-danger-sm {
  background: var(--danger);
  color: #fff;
  border: none;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}
.btn-cancel-sm {
  background: var(--panel-2);
  border: 1px solid var(--line);
  color: var(--ink);
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

/* 卷宗列表 */
.records-container {
  flex: 1;
  padding: 14px 20px;
  overflow-y: auto;
}
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.day-groups-wrapper {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.day-group-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.day-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 10px;
  border-left: 3px solid var(--accent);
  background: rgba(255, 255, 255, 0.03);
  border-radius: 0 6px 6px 0;
}
.day-title-badge {
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
}
.day-count-badge {
  font-size: 11px;
  color: var(--ink-dim);
}

.day-records-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.record-card {
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  transition: transform 0.12s, border-color 0.12s;
}
.record-card:hover {
  border-color: var(--accent);
}
.record-card.is-wrong {
  border-left: 4px solid var(--danger);
}
.record-card.is-detain {
  border-left: 4px solid #c084fc;
}

.rec-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.applicant-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
}
.portrait {
  font-size: 36px;
  line-height: 1;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 4px 6px;
}
.name-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.name {
  font-size: 15px;
}
.scene-tag {
  font-size: 11px;
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 7px;
  border-radius: 4px;
  color: var(--ink-dim);
}
.time-tag {
  font-size: 11px;
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
  padding: 2px 7px;
  border-radius: 4px;
}
.statement {
  margin-top: 5px;
  font-size: 13px;
  font-style: italic;
  line-height: 1.45;
}

.verdict-box {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
  min-width: 170px;
}
.status-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 5px;
}
.badge-ok {
  background: rgba(34, 197, 94, 0.15);
  color: var(--ok);
  border: 1px solid rgba(34, 197, 94, 0.3);
}
.badge-catch {
  background: rgba(192, 132, 252, 0.18);
  color: #d8b4fe;
  border: 1px solid rgba(192, 132, 252, 0.4);
}
.badge-wrong {
  background: rgba(239, 68, 68, 0.18);
  color: var(--danger);
  border: 1px solid rgba(239, 68, 68, 0.3);
}
.compare-line {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
}
.v-label {
  color: var(--ink-dim);
}
.v-val {
  font-weight: 700;
}
.v-sep {
  color: var(--line);
}
.text-allow {
  color: var(--ok);
}
.text-deny {
  color: var(--danger);
}
.text-detain {
  color: #c084fc;
}

.truth-box {
  background: rgba(0, 0, 0, 0.25);
  border: 1px dashed var(--line);
  border-radius: 6px;
  padding: 7px 12px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.truth-icon {
  font-size: 14px;
}
.truth-text {
  flex: 1;
  color: #cbd5e1;
}
.penalty-tag {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.modal-footer {
  padding: 11px 20px;
  background: var(--panel-2);
  border-top: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
