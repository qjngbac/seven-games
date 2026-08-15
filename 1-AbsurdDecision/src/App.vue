<script setup lang="ts">
import { onMounted, computed } from "vue";
import { useGame } from "./stores/game";
import ResourceBar from "./components/ResourceBar.vue";
import MainMenu from "./components/MainMenu.vue";
import RoleSelect from "./components/RoleSelect.vue";
import DayStart from "./components/DayStart.vue";
import EventPresent from "./components/EventPresent.vue";
import EventResult from "./components/EventResult.vue";
import DaySummary from "./components/DaySummary.vue";
import Ending from "./components/Ending.vue";
import Settings from "./components/Settings.vue";

const game = useGame();

onMounted(() => game.boot());

const gameplay = computed(() =>
  ["DAY_START", "EVENT_PRESENT", "EVENT_RESULT", "DAY_SUMMARY"].includes(game.screen)
);
</script>

<template>
  <div class="app-wrap">
    <div class="topbar" v-if="game.screen !== 'BOOT'">
      <div class="brand">今天也要做决定</div>
      <button class="gear" @click="game.openSettings()" title="设置">⚙</button>
    </div>

    <div class="err-banner" v-if="game.lastError">{{ game.lastError }}</div>

    <ResourceBar v-if="gameplay" />

    <transition name="fade" mode="out-in">
      <MainMenu v-if="game.screen === 'MAIN_MENU'" />
      <RoleSelect v-else-if="game.screen === 'ROLE_SELECT'" />
      <DayStart v-else-if="game.screen === 'DAY_START'" />
      <EventPresent v-else-if="game.screen === 'EVENT_PRESENT'" />
      <EventResult v-else-if="game.screen === 'EVENT_RESULT'" />
      <DaySummary v-else-if="game.screen === 'DAY_SUMMARY'" />
      <Ending v-else-if="game.screen === 'ENDING'" />
      <Settings v-else-if="game.screen === 'SETTINGS'" />
    </transition>
  </div>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 2px 2px;
}
.brand {
  font-weight: 800;
  font-size: 18px;
  letter-spacing: 1px;
}
.gear {
  border: none;
  background: transparent;
  font-size: 20px;
  line-height: 1;
}
</style>
