<script setup lang="ts">
import { computed } from "vue";
import { useGame } from "./game/store";
import MainMenu from "./components/MainMenu.vue";
import ChapterSelect from "./components/ChapterSelect.vue";
import PuzzleIntro from "./components/PuzzleIntro.vue";
import PlayScreen from "./components/PlayScreen.vue";
import ResultScreen from "./components/ResultScreen.vue";

const game = useGame();
const rootClass = computed(() => ({
  "large-font": game.settings.largeFont,
  colorblind: game.settings.colorBlind,
}));
</script>

<template>
  <div class="app-root" :class="rootClass">
    <Transition name="fade" mode="out-in">
      <MainMenu v-if="game.screen === 'MAIN_MENU'" />
      <ChapterSelect v-else-if="game.screen === 'CHAPTER_SELECT'" />
      <PuzzleIntro v-else-if="game.screen === 'PUZZLE_INTRO'" />
      <PlayScreen v-else-if="game.screen === 'PLAYING'" />
      <ResultScreen v-else-if="game.screen === 'RESULT'" />
    </Transition>
  </div>
</template>
