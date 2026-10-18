import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { PACKS, getPack } from "../data/packs";
import { MODES, type ModeId } from "./modes/types";
import { GameSession, type RoundView, type RunResult } from "./session";
import type { Action, Rule } from "./rules/schema";
import { makeSeed } from "./rng";
import {
  loadSettings,
  updateSettings as saveSettingsPatch,
  loadHistory,
  clearHistory,
  clearModeHistory,
  addHistoryRecord,
  recordBest,
  getBest,
  markDailyDone,
  isDailyDone,
  type Settings,
  type RunHistoryRecord,
} from "./settings";
import { sfx, applyAudioSettings } from "./audio/sfx";

export type Screen = "MENU" | "PREVIEW" | "PLAY" | "RESULT";

export interface FeedbackInfo {
  kind: "correct" | "wrong" | "timeout";
  message: string;
  points?: number;
}

export const useGameStore = defineStore("game", () => {
  const screen = ref<Screen>("MENU");
  const selectedMode = ref<ModeId>("normal");
  const selectedPack = ref<string>(PACKS[0]?.id ?? "pack-base");

  const settings = ref<Settings>(loadSettings());
  const history = ref<RunHistoryRecord[]>(loadHistory());

  const session = ref<GameSession | null>(null);
  const currentRound = ref<RoundView | null>(null);
  const lastResult = ref<RunResult | null>(null);
  const lastFeedback = ref<FeedbackInfo | null>(null);
  const newRuleAlert = ref<Rule | null>(null);
  const isRulePaused = ref<boolean>(false);

  const timeRemainingMs = ref<number>(0);
  const deadlineMs = ref<number>(0);
  const roundStartTime = ref<number>(0);
  let timerId: number | null = null;

  // 种子与元数据
  const currentSeed = ref<number>(0);
  const isDaily = ref<boolean>(false);
  const dailySeedKey = ref<string>("");

  // 响应式统计
  const lives = ref<number>(3);
  const score = ref<number>(0);
  const combo = ref<number>(0);
  const roundIndex = ref<number>(0);
  const targetRounds = ref<number>(30);
  const activeRules = ref<Rule[]>([]);

  // 声音同步
  applyAudioSettings(settings.value.sfx, settings.value.volume);

  const currentPack = computed(() => getPack(selectedPack.value) ?? PACKS[0].ruleset);
  const currentModeConfig = computed(() => MODES[selectedMode.value]);

  const timePercent = computed(() => {
    if (deadlineMs.value <= 0) return 100;
    return Math.max(0, Math.min(100, (timeRemainingMs.value / deadlineMs.value) * 100));
  });

  const currentBest = computed(() => getBest(selectedMode.value, selectedPack.value));

  function dailyKey(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `daily-${y}-${m}-${day}`;
  }

  function stopTimer(): void {
    if (timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  function startTimer(duration: number): void {
    stopTimer();
    deadlineMs.value = duration;
    timeRemainingMs.value = duration;
    roundStartTime.value = Date.now();

    if (duration <= 0) return; // 禅道模式等不限时

    const interval = 20;
    timerId = window.setInterval(() => {
      const elapsed = Date.now() - roundStartTime.value;
      const left = Math.max(0, duration - elapsed);
      timeRemainingMs.value = left;

      if (left <= 0) {
        stopTimer();
        onTimeout();
      }
    }, interval);
  }

  function startPreview(mId?: ModeId, pId?: string): void {
    sfx.ensure();
    sfx.click();
    if (mId) selectedMode.value = mId;
    if (pId) selectedPack.value = pId;
    screen.value = "PREVIEW";
  }

  function startPlay(): void {
    sfx.ensure();
    sfx.go();

    const daily = selectedMode.value === "daily";
    const dKey = dailyKey();
    const seed = daily
      ? makeSeed(dKey)
      : (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;

    currentSeed.value = seed;
    isDaily.value = daily;
    dailySeedKey.value = dKey;

    const pack = currentPack.value;
    const sess = new GameSession({
      mode: selectedMode.value,
      ruleset: pack,
      seed,
    });

    session.value = sess;
    targetRounds.value = sess.mode.targetRounds;
    newRuleAlert.value = null;
    lastFeedback.value = null;

    nextRound();
    screen.value = "PLAY";
  }

  function nextRound(): void {
    if (!session.value || session.value.isOver()) {
      finishGame();
      return;
    }

    const r = session.value.beginRound();
    currentRound.value = r;
    roundIndex.value = r.index;
    lives.value = session.value.getLives();
    score.value = session.value.getScore();
    combo.value = session.value.getCombo();
    activeRules.value = session.value.getActiveRules();

    startTimer(r.deadlineMs);
  }

  function onTimeout(): void {
    submitAction(null);
  }

  function submitAction(action: Action | null): void {
    if (!session.value || screen.value !== "PLAY") return;

    stopTimer();
    const reactionMs = Date.now() - roundStartTime.value;
    const res = session.value.submit(action, reactionMs);

    lives.value = res.lives;
    score.value = res.score;
    combo.value = res.combo;

    // 反馈与音效
    if (res.timeout) {
      sfx.wrong();
      lastFeedback.value = {
        kind: "timeout",
        message: `超时！应按 [${actionLabel(res.correctAction)}]`,
      };
    } else if (res.correct) {
      if (res.combo >= 3) sfx.combo(res.combo);
      else sfx.correct();

      lastFeedback.value = {
        kind: "correct",
        message: `正确！+${res.gained}分`,
        points: res.gained,
      };
    } else {
      sfx.wrong();
      const violatedRule = res.trace.length > 0 ? res.trace[res.trace.length - 1].text : "基础默认规则";
      lastFeedback.value = {
        kind: "wrong",
        message: `错误！违反规则：${violatedRule}（应按 [${actionLabel(res.correctAction)}]）`,
      };
    }

    if (res.over) {
      finishGame();
      return;
    }

    // 动态规则跑路提醒：进入战术暂停，绝不让下一轮偷跑倒计时！
    if (res.revealed && res.revealed.length > 0) {
      stopTimer();
      sfx.ruleChange();
      newRuleAlert.value = res.revealed[0];
      activeRules.value = session.value.getActiveRules();
      isRulePaused.value = true;
      return;
    }

    // 常规轮次推进
    window.setTimeout(() => {
      if (screen.value === "PLAY" && !isRulePaused.value) {
        nextRound();
      }
    }, 260);
  }

  function actionLabel(a: Action): string {
    switch (a) {
      case "LEFT":
        return "← 向左";
      case "RIGHT":
        return "→ 向右";
      case "SKIP":
        return "↓ 跳过";
      default:
        return a;
    }
  }

  function finishGame(): void {
    stopTimer();
    if (!session.value) return;

    const r = session.value.isOver() ? session.value.buildResult() : session.value.quit();
    lastResult.value = r;

    // 记录纪录
    const manual = r.reason === "manual";
    const date = new Date().toISOString().slice(0, 10);
    if (!manual) {
      recordBest(selectedMode.value, selectedPack.value, {
        score: r.score,
        accuracy: r.accuracy,
        date,
      });
      if (isDaily.value) markDailyDone(dailySeedKey.value);
    }

    // 归档战绩
    const tags = computeTags(r);
    const rec: RunHistoryRecord = {
      id: Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      modeId: selectedMode.value,
      modeName: currentModeConfig.value.name,
      packId: selectedPack.value,
      packName: currentPack.value.name,
      timestamp: new Date().toLocaleString("zh-CN", { hour12: false }),
      score: r.score,
      accuracy: r.accuracy,
      rounds: r.rounds,
      correct: r.correct,
      maxCombo: r.maxCombo,
      reactionAvg: r.reaction.avg,
      reason: r.reason,
      tags,
    };
    addHistoryRecord(rec);
    history.value = loadHistory();

    screen.value = "RESULT";
  }

  function computeTags(r: RunResult): string[] {
    const t: string[] = [];
    if (r.accuracy >= 0.95) t.push("铁律执行者");
    else if (r.accuracy >= 0.8) t.push("稳如老狗");
    else if (r.accuracy < 0.5) t.push("规则眩晕中");
    if (r.reaction.count > 0 && r.reaction.avg < 450) t.push("闪电反应");
    if (r.maxCombo >= 10) t.push("连击狂魔");
    const top = Object.entries(r.mistakesByRule).sort((a, b) => b[1] - a[1])[0];
    if (top) {
      if (top[0] === "cat_invert" || top[0].includes("cat")) t.push("被猫整蛊");
      else if (top[0] === "default") t.push("错在默认项");
      else t.push("细节翻车");
    }
    if (t.length === 0) t.push("挑战完成");
    return t.slice(0, 3);
  }

  function surrender(): void {
    if (session.value) {
      session.value.quit();
      finishGame();
    } else {
      goMenu();
    }
  }

  function replay(): void {
    startPlay();
  }

  function practice(): void {
    selectedMode.value = "practice";
    startPlay();
  }

  function goMenu(): void {
    stopTimer();
    isRulePaused.value = false;
    newRuleAlert.value = null;
    screen.value = "MENU";
  }

  function patchSettings(patch: Partial<Settings>): void {
    settings.value = saveSettingsPatch(patch);
    applyAudioSettings(settings.value.sfx, settings.value.volume);
  }

  function clearAllHistory(): void {
    clearHistory();
    history.value = [];
  }

  function clearModeHistoryStore(modeId: string): void {
    clearModeHistory(modeId);
    history.value = history.value.filter((r) => r.modeId !== modeId);
  }

  function dismissNewRuleAlert(): void {
    newRuleAlert.value = null;
    isRulePaused.value = false;
  }

  function resumeAfterNewRule(): void {
    if (!isRulePaused.value) return;
    sfx.click();
    newRuleAlert.value = null;
    isRulePaused.value = false;
    lastFeedback.value = null;
    if (screen.value === "PLAY") {
      nextRound();
    }
  }

  return {
    screen,
    selectedMode,
    selectedPack,
    currentPack,
    currentModeConfig,
    settings,
    history,
    session,
    currentRound,
    lastResult,
    lastFeedback,
    newRuleAlert,
    isRulePaused,
    timeRemainingMs,
    deadlineMs,
    timePercent,
    lives,
    score,
    combo,
    roundIndex,
    targetRounds,
    activeRules,
    currentBest,
    isDaily,
    dailyKey,
    isDailyDone,
    startPreview,
    startPlay,
    submitAction,
    resumeAfterNewRule,
    surrender,
    replay,
    practice,
    goMenu,
    patchSettings,
    clearAllHistory,
    clearModeHistoryStore,
    dismissNewRuleAlert,
  };
});
