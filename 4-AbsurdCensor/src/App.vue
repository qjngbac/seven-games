<script setup lang="ts">
import { useGame } from './store'
import MainMenu from './components/MainMenu.vue'
import MorningBrief from './components/MorningBrief.vue'
import DeskView from './components/DeskView.vue'
import DayEnd from './components/DayEnd.vue'
import Ending from './components/Ending.vue'

const game = useGame()
</script>

<template>
  <div class="app-root">
    <MainMenu v-if="game.phase === 'menu'" />
    <MorningBrief v-else-if="game.phase === 'brief'" />
    <DeskView v-else-if="game.phase === 'desk' || game.phase === 'feedback'" />
    <DayEnd v-else-if="game.phase === 'dayend'" />
    <Ending v-else-if="game.phase === 'ending'" />
  </div>
</template>
