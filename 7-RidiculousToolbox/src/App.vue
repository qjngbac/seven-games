<script setup lang="ts">
import { watch } from 'vue';
import { useGame } from './game/store';
import MainMenu from './components/MainMenu.vue';
import LevelSelect from './components/LevelSelect.vue';
import Briefing from './components/Briefing.vue';
import PlayScreen from './components/PlayScreen.vue';
import ResultScreen from './components/ResultScreen.vue';
import GalleryView from './components/Gallery.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import Tutorial from './components/Tutorial.vue';

const g = useGame();

function applySettings(): void {
  const r = document.documentElement;
  r.dataset.fontsize = g.settings.fontSize;
  r.dataset.noshake = String(g.settings.noShake);
  r.dataset.colorblind = String(g.settings.colorblind);
}
watch(() => g.settings, applySettings, { deep: true, immediate: true });
</script>

<template>
  <div class="app-shell">
    <MainMenu v-if="g.screen === 'MENU'" />
    <LevelSelect v-else-if="g.screen === 'LEVEL_SELECT'" />
    <Briefing v-else-if="g.screen === 'BRIEFING'" />
    <PlayScreen v-else-if="g.screen === 'PLAY'" />
    <ResultScreen v-else-if="g.screen === 'RESULT'" />
    <GalleryView v-else-if="g.screen === 'GALLERY'" />
    <SettingsPanel v-else-if="g.screen === 'SETTINGS'" />
    <Tutorial v-if="g.screen === 'PLAY' && !g.tutorialDone" />
  </div>
</template>
