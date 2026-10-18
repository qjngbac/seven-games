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
import HistoryModal from "./components/HistoryModal.vue";

const game = useGame();

onMounted(() => game.boot());

const gameplay = computed(() =>
  ["DAY_START", "EVENT_PRESENT", "EVENT_RESULT", "DAY_SUMMARY"].includes(game.screen)
);

function handleMenuClick() {
  if (gameplay.value) {
    game.quitToMenu();
  } else {
    game.backToMenu();
  }
}

function goLobby() {
  window.location.href = "../../index.html";
}
</script>

<template>
  <div class="app-wrap">
    <div class="topbar" v-if="game.screen !== 'BOOT'">
      <div
        class="brand-wrap"
        :class="{ clickable: game.screen !== 'MAIN_MENU' }"
        @click="game.screen !== 'MAIN_MENU' && handleMenuClick()"
        title="返回主菜单"
      >
        <span class="brand">今天也要做决定</span>
        <span class="day-badge" v-if="gameplay && game.game">DAY {{ game.game.day }}</span>
      </div>
      <div class="top-actions">
        <button
          v-if="gameplay && game.game && game.game.choiceLog.length"
          class="top-btn menu-btn"
          @click="game.openHistory('current')"
          title="查看本周目已做抉择流水"
        >
          📜 历程 ({{ game.game.choiceLog.length }})
        </button>
        <button
          v-if="game.screen !== 'MAIN_MENU'"
          class="top-btn menu-btn"
          @click="handleMenuClick"
          title="保存并返回主菜单"
        >
          🏠 游戏菜单
        </button>
        <button
          class="top-btn menu-btn"
          @click="goLobby"
          title="返回七款小游戏大厅"
        >
          🎮 游戏大厅
        </button>
        <button class="gear" @click="game.openSettings()" title="设置">⚙</button>
      </div>
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

    <HistoryModal
      :open="game.showHistoryModal"
      :initial-tab="game.historyTab"
      @close="game.closeHistory()"
    />
  </div>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 2px 6px;
}
.brand-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.brand-wrap.clickable {
  cursor: pointer;
  user-select: none;
}
.brand-wrap.clickable:hover .brand {
  color: var(--accent);
}
.brand {
  font-weight: 800;
  font-size: 18px;
  letter-spacing: 1px;
  transition: color 0.15s ease;
}
.day-badge {
  font-size: 12px;
  font-weight: 800;
  background: #fff;
  border: 1px solid var(--line);
  color: var(--accent);
  padding: 2px 8px;
  border-radius: 12px;
}
.top-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.top-btn {
  border: 1px solid var(--line);
  background: #ffffff;
  color: var(--ink);
  font-size: 13px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: transform 0.08s ease, border-color 0.12s ease, background 0.12s ease;
}
.top-btn:hover {
  border-color: var(--accent);
  background: #fff8f5;
  transform: translateY(-1px);
}
.top-btn:active {
  transform: translateY(1px);
}
.gear {
  border: none;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  padding: 4px;
  border-radius: 8px;
  transition: background 0.12s ease, transform 0.12s ease;
}
.gear:hover {
  background: rgba(0, 0, 0, 0.05);
  transform: rotate(30deg);
}
</style>
