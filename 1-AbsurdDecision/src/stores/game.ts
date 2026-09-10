// Pinia 状态机：唯一的"业务状态"所有者。UI 只调用 actions，绝不直接改 game。
// 设计原因：文档 §4 / §9 要求界面由明确状态驱动，业务状态不被组件直接修改。
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { ChoiceDef, EventDef, GameState, ResourceKey } from "../core/types";
import { createInitialState, buildResourceMap } from "../core/state";
import { Rng, makeSeed } from "../core/rng";
import {
  choose,
  beginDay,
  isDayComplete,
  endDay,
  evaluateEnding,
  drawNextEvent,
  ENDINGS,
} from "../core/game";
import { bandOf } from "../core/resources";
import type { Band } from "../core/types";
import { choiceAvailable } from "../core/eventSelector";
import { CONTENT, CONTENT_ERRORS, CONTENT_STATS, reportContent } from "../data";
import { loadGame, saveGame, clearSave, hasUsableSave, migrate } from "../services/save";
import { sound } from "../services/audio";

export type Screen =
  | "BOOT"
  | "MAIN_MENU"
  | "ROLE_SELECT"
  | "DAY_START"
  | "EVENT_PRESENT"
  | "EVENT_RESULT"
  | "DAY_SUMMARY"
  | "ENDING"
  | "SETTINGS";

const SFX_KEY = "absurd-decision:sfx";

// rng 不放入响应式状态：它是带内部态的纯逻辑对象，靠 game.rngState 与存档同步。
let rng: Rng = new Rng(1);

export interface ResultView {
  eventTitle: string;
  choiceText: string;
  resultText: string;
  delta: Partial<Record<ResourceKey, number>>;
  delayedScheduled: boolean;
  delayedNote?: string;
}

export const useGame = defineStore("game", () => {
  const screen = ref<Screen>("BOOT");
  const game = ref<GameState | null>(null);
  const event = ref<EventDef | null>(null);
  const result = ref<ResultView | null>(null);
  const dueNotes = ref<string[]>([]);
  const contentReport = ref<string>(reportContent());
  const sfxOn = ref<boolean>(true);
  const lastError = ref<string>("");

  // ---- 派生：资源区间（供 UI 配色） ----
  const rm = buildResourceMap(CONTENT);
  const bands = computed<Record<ResourceKey, Band>>(() => {
    const out = {} as Record<ResourceKey, Band>;
    if (!game.value) return out;
    for (const d of CONTENT.resources) out[d.key] = bandOf(d, game.value.resources[d.key]);
    return out;
  });
  // 存档存在性需要响应式跟踪：hasSave() 不是响应式源，直接包在 computed 里只会被永久缓存
  const savePresent = ref(false);
  const canContinue = computed(() => savePresent.value);
  const endingInfo = computed(() =>
    game.value && game.value.ending ? ENDINGS[game.value.ending] ?? null : null
  );

  function syncRng() {
    if (game.value) game.value.rngState = rng.state;
  }
  function persist() {
    if (!game.value) return;
    syncRng();
    const r = saveGame(game.value);
    if (!r.ok) lastError.value = r.error ?? "存档失败";
    else savePresent.value = true;
  }

  // ---- 启动 ----
  function boot() {
    const saved = localStorage.getItem(SFX_KEY);
    if (saved === "0") {
      sfxOn.value = false;
      sound.toggle(false);
    }
    if (CONTENT_ERRORS.length) lastError.value = contentReport.value;
    // 用"能否真正读出一份合法存档"来判断，而不是仅看键是否存在
    savePresent.value = hasUsableSave();
    screen.value = "MAIN_MENU";
  }

  // ---- 新游戏 / 开局特质 ----
  function newGame() {
    const seed = makeSeed();
    game.value = createInitialState(seed, CONTENT, null);
    rng = new Rng(seed);
    event.value = null;
    result.value = null;
    screen.value = "ROLE_SELECT";
  }
  function selectTrait(traitId: string | null) {
    if (!game.value) return;
    const seed = game.value.seed;
    // 以选定特质重建初始状态（开局特质在 createInitialState 内应用）
    game.value = createInitialState(seed, CONTENT, traitId);
    rng = new Rng(seed);
    enterDay();
  }

  // ---- 继续 ----
  function continueGame() {
    const st = loadGame();
    if (!st) {
      // 存档损坏 / 版本不兼容：明确告知，而不是静默回菜单让玩家以为按钮坏了
      lastError.value = "存档已损坏或版本不兼容，无法继续。可从主菜单开始新游戏。";
      savePresent.value = false;
      screen.value = "MAIN_MENU";
      return;
    }
    lastError.value = "";
    game.value = st;
    rng = new Rng(st.rngState ?? st.seed);
    // 恢复界面
    if (st.ending) {
      screen.value = "ENDING";
      event.value = null;
      result.value = null;
    } else if (st.currentEventId) {
      const ev = CONTENT.events.find((e) => e.id === st.currentEventId) ?? null;
      if (ev) {
        event.value = ev;
        result.value = null;
        screen.value = "EVENT_PRESENT";
      } else {
        enterDay();
      }
    } else {
      dueNotes.value = st.lastDueNotes ?? [];
      event.value = null;
      result.value = null;
      screen.value = "DAY_START";
    }
  }

  // ---- 进入新的一天（结算延迟效果） ----
  function enterDay() {
    if (!game.value) return;
    const due = beginDay(game.value, CONTENT);
    game.value.currentEventId = null;
    game.value.lastDueNotes = due.notes;
    dueNotes.value = due.notes;
    persist();
    screen.value = "DAY_START";
  }

  // ---- 抽取并展示事件 ----
  function drawEvent() {
    if (!game.value) return;
    const ev = drawNextEvent(game.value, CONTENT, rng);
    syncRng();
    if (!ev) {
      // 兜底：无候选事件时不死锁，进入日结
      game.value.eventsDoneToday = game.value.eventsPerDay;
      screen.value = "DAY_SUMMARY";
      return;
    }
    game.value.currentEventId = ev.id;
    event.value = ev;
    result.value = null;
    persist();
    screen.value = "EVENT_PRESENT";
  }

  function availableChoices(): ChoiceDef[] {
    if (!event.value || !game.value) return [];
    return event.value.choices.filter((c) => choiceAvailable(c, game.value!, CONTENT));
  }

  // ---- 做出选择 ----
  function chooseChoice(choiceId: string) {
    if (!game.value || !event.value) return;
    const c = event.value.choices.find((x) => x.id === choiceId);
    if (!c) return;
    if (!choiceAvailable(c, game.value, CONTENT)) return; // 禁用选项不可选
    const r = choose(game.value, CONTENT, event.value, c);
    if (!r.ok) {
      lastError.value = "结算失败：" + (r.error ?? "未知");
      return;
    }
    result.value = {
      eventTitle: event.value.title,
      choiceText: c.text,
      resultText: c.resultText,
      delta: r.delta,
      delayedScheduled: r.delayedScheduled,
      delayedNote: r.delayedNote,
    };
    game.value.currentEventId = null;
    syncRng();
    sound.click();
    for (const k of Object.keys(r.delta) as ResourceKey[]) {
      if ((r.delta[k] ?? 0) > 0) sound.resourceUp();
      else if ((r.delta[k] ?? 0) < 0) sound.resourceDown();
    }
    persist();
    screen.value = "EVENT_RESULT";
  }

  // ---- 结果页继续：决定下一步 ----
  function advanceFromResult() {
    if (!game.value) return;
    const e = evaluateEnding(game.value, CONTENT);
    if (e && e.kind === "lose") {
      game.value.ending = e.key;
      game.value.endingKind = "lose";
      finishEnding();
      return;
    }
    if (isDayComplete(game.value)) {
      screen.value = "DAY_SUMMARY";
      persist();
      return;
    }
    drawEvent();
  }

  // ---- 日结继续：推进到下一天或通关 ----
  function proceedFromSummary() {
    if (!game.value) return;
    endDay(game.value, CONTENT);
    if (game.value.ending) {
      finishEnding();
      return;
    }
    enterDay();
  }

  function finishEnding() {
    if (!game.value) return;
    game.value.currentEventId = null;
    if (game.value.endingKind === "win") sound.win();
    else sound.lose();
    persist();
    screen.value = "ENDING";
  }

  // ---- 设置 / 杂项 ----
  function toggleSfx(on: boolean) {
    sfxOn.value = on;
    sound.toggle(on);
    localStorage.setItem(SFX_KEY, on ? "1" : "0");
  }
  function openSettings() {
    screen.value = "SETTINGS";
  }
  function backToMenu() {
    screen.value = "MAIN_MENU";
  }
  function restart() {
    clearSave();
    savePresent.value = false;
    game.value = null;
    event.value = null;
    result.value = null;
    screen.value = "MAIN_MENU";
  }
  function quitToMenu() {
    persist();
    screen.value = "MAIN_MENU";
  }

  return {
    // state
    screen,
    game,
    event,
    result,
    dueNotes,
    contentReport,
    sfxOn,
    lastError,
    // derived
    bands,
    canContinue,
    endingInfo,
    rm,
    // actions
    boot,
    newGame,
    selectTrait,
    continueGame,
    enterDay,
    drawEvent,
    availableChoices,
    chooseChoice,
    advanceFromResult,
    proceedFromSummary,
    toggleSfx,
    openSettings,
    backToMenu,
    restart,
    quitToMenu,
    CONTENT_STATS,
    migrateUnused: migrate, // 暴露以便测试迁移逻辑
  };
});
