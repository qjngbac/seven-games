<script setup lang="ts">
import { onMounted, computed, ref, watch } from 'vue'
import { useGame } from './store'
import CaseSelect from './components/CaseSelect.vue'
import Briefing from './components/Briefing.vue'
import Investigation from './components/Investigation.vue'
import Dialogue from './components/Dialogue.vue'
import EvidenceBoard from './components/EvidenceBoard.vue'
import Accusation from './components/Accusation.vue'
import Result from './components/Result.vue'
import SettingsPanel from './components/SettingsPanel.vue'

const game = useGame()
const showSettings = ref(false)

const screenComp = computed(() => {
  switch (game.screen) {
    case 'case_select':
      return CaseSelect
    case 'briefing':
      return Briefing
    case 'investigation':
      return Investigation
    case 'dialogue':
      return Dialogue
    case 'board':
      return EvidenceBoard
    case 'accusation':
      return Accusation
    case 'result':
      return Result
    default:
      return CaseSelect
  }
})

const screenLabel = computed(() => {
  return {
    case_select: '案件选择',
    briefing: '案件档案',
    investigation: '调查中心',
    dialogue: '对话',
    board: '推理板',
    accusation: '指控',
    result: '结算'
  }[game.screen]
})

function applySettings() {
  const root = document.documentElement
  root.style.setProperty('--font-size', `${game.settings.fontSize}px`)
  root.classList.toggle('colorblind', game.settings.colorblind)
  root.classList.toggle('no-shake', game.settings.noShake)
}

onMounted(() => {
  game.load()
  applySettings()
})
watch(
  () => ({ ...game.settings }),
  () => applySettings(),
  { deep: true }
)

const canResume = computed(() => !!game.currentCaseId && game.screen !== 'case_select')
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <h1>🔍 谁动了生产环境</h1>
      <span class="chip">声誉 {{ game.reputation }}</span>
      <span v-if="game.currentCase" class="chip">{{ game.currentCase.title }} · {{ screenLabel }}</span>
      <span class="spacer"></span>
      <button class="btn-ghost" @click="showSettings = true">⚙ 设置</button>
      <button v-if="canResume" class="btn-ghost" @click="game.toCaseSelect()">≡ 案件</button>
    </header>

    <main class="stage">
      <component :is="screenComp" />
    </main>

    <SettingsPanel v-if="showSettings" @close="showSettings = false" />
  </div>
</template>
