<script setup lang="ts">
import { computed, watch } from "vue";
import { useGameStore } from "./game/store";
import MainMenu from "./components/MainMenu.vue";
import RulePreview from "./components/RulePreview.vue";
import PlayScreen from "./components/PlayScreen.vue";
import ResultScreen from "./components/ResultScreen.vue";

const game = useGameStore();

function applySettings() {
  const root = document.documentElement;
  root.classList.toggle("large-font", game.settings.fontSize === "large");
  root.classList.toggle("colorblind", game.settings.colorblind);
}

watch(
  () => [game.settings.fontSize, game.settings.colorblind],
  () => applySettings(),
  { immediate: true }
);

const currentView = computed(() => {
  switch (game.screen) {
    case "MENU":
      return MainMenu;
    case "PREVIEW":
      return RulePreview;
    case "PLAY":
      return PlayScreen;
    case "RESULT":
      return ResultScreen;
    default:
      return MainMenu;
  }
});
</script>

<template>
  <component :is="currentView" />
</template>
