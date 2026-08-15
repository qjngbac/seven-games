import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { Puzzle, RoleAssignment, RoleId } from "../logic/ast";
import { getPuzzle, CHAPTERS } from "../puzzle/repository";
import { ReasoningBoard } from "../features/board/board";
import { getHints, uniqueSolution } from "../features/hints/hints";
import { explainViolation, buildReasoningChain } from "../logic/explainer";
import { answerMatchesSolution } from "../logic/solver";
import { computeScore } from "./scoring";
import {
  loadSettings,
  saveSettings,
  loadProgress,
  saveProgress,
  type Settings,
  type Progress,
} from "./settings";
import { sound } from "./audio";

export type Screen =
  | "MAIN_MENU"
  | "CHAPTER_SELECT"
  | "PUZZLE_INTRO"
  | "PLAYING"
  | "RESULT";

export interface ViolationInfo {
  message: string;
}

export interface ResultInfo {
  win: boolean;
  score: number;
  stars: 1 | 2 | 3;
  timeMs: number;
  hintsUsed: number;
  errors: number;
  reasoningChain: string[];
  solution: RoleAssignment;
}

export const useGame = defineStore("game", () => {
  const screen = ref<Screen>("MAIN_MENU");
  const selectedChapterId = ref<string>(CHAPTERS[0].id);
  const currentPuzzleId = ref<string | null>(null);
  const puzzle = ref<Puzzle | null>(null);
  const board = ref<ReasoningBoard | null>(null);

  const startTime = ref<number>(0);
  const elapsedMs = ref<number>(0);
  let timer: ReturnType<typeof setInterval> | null = null;

  const errors = ref<number>(0);
  const hintsUsed = ref<number>(0);
  const hints = ref<{ level: 0 | 1 | 2 | 3; texts: [string, string, string] | null }>({
    level: 0,
    texts: null,
  });
  const lastViolation = ref<ViolationInfo | null>(null);
  const lastResult = ref<ResultInfo | null>(null);

  const settings = ref<Settings>(loadSettings());
  const progress = ref<Progress>(loadProgress());

  function persistSettings(): void {
    saveSettings(settings.value);
    sound.setVolume(settings.value.sfxVolume);
  }
  function persistProgress(): void {
    saveProgress(progress.value);
  }

  const chapters = computed(() => CHAPTERS);
  const totalPuzzles = computed(() =>
    CHAPTERS.reduce((total, chapter) => total + chapter.puzzleIds.length, 0),
  );
  const currentChapter = computed(() =>
    CHAPTERS.find((c) => c.id === selectedChapterId.value),
  );
  const canSubmit = computed(() => {
    if (!puzzle.value || !board.value) return false;
    return puzzle.value.characters.every((c) => board.value!.getCharacterMark(c.id) !== null);
  });

  function stopTimer(): void {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }
  function startTimer(): void {
    startTime.value = Date.now();
    elapsedMs.value = 0;
    stopTimer();
    timer = setInterval(() => {
      elapsedMs.value = Date.now() - startTime.value;
    }, 250);
  }

  function goMenu(): void {
    stopTimer();
    screen.value = "MAIN_MENU";
  }
  function openChapters(): void {
    screen.value = "CHAPTER_SELECT";
  }
  function selectChapter(id: string): void {
    selectedChapterId.value = id;
  }

  function startPuzzle(id: string): void {
    const p = getPuzzle(id);
    if (!p) return;
    currentPuzzleId.value = id;
    puzzle.value = p;
    board.value = new ReasoningBoard(p);
    errors.value = 0;
    hintsUsed.value = 0;
    hints.value = { level: 0, texts: null };
    lastViolation.value = null;
    lastResult.value = null;
    screen.value = "PUZZLE_INTRO";
  }

  function beginPlay(): void {
    if (!puzzle.value) return;
    screen.value = "PLAYING";
    startTimer();
  }

  function markCharacter(id: string, role: RoleId | null): void {
    board.value?.markCharacter(id, role);
    sound.mark();
  }
  function markStatement(id: string, truth: boolean | null): void {
    board.value?.markStatement(id, truth);
    sound.mark();
  }
  function setNote(target: string, note: string): void {
    board.value?.setNote(target, note);
  }
  function undo(): void {
    board.value?.undo();
    sound.click();
  }
  function clearBoard(): void {
    board.value?.clear();
    sound.click();
  }

  function requestHint(): void {
    if (!puzzle.value) return;
    if (hints.value.level >= 3) return;
    if (!hints.value.texts) hints.value.texts = getHints(puzzle.value);
    hints.value.level = (hints.value.level + 1) as 1 | 2 | 3;
    hintsUsed.value += 1;
    sound.hint();
  }

  function submit(): void {
    if (!puzzle.value || !board.value || !canSubmit.value) return;
    const marks = board.value.characterAnswers();
    const answer: RoleAssignment = {};
    for (const c of puzzle.value.characters) {
      const m = marks[c.id];
      if (m === null) return; // 不应发生（canSubmit 已挡）
      answer[c.id] = m;
    }
    if (answerMatchesSolution(puzzle.value, answer)) {
      // 仅在答对时停止计时：猜错后留在 PLAYING，计时继续累积，
      // 撤销/重新猜测都不会让计时冻结。
      elapsedMs.value = Date.now() - startTime.value; // 精确收尾，避免 250ms 间隔漂移
      stopTimer();
      const sol = uniqueSolution(puzzle.value)!;
      const res = computeScore({
        timeMs: elapsedMs.value,
        hintsUsed: hintsUsed.value,
        errors: errors.value,
      });
      lastResult.value = {
        win: true,
        score: res.score,
        stars: res.stars,
        timeMs: elapsedMs.value,
        hintsUsed: hintsUsed.value,
        errors: errors.value,
        reasoningChain: buildReasoningChain(puzzle.value, sol),
        solution: sol,
      };
      // 记录进度
      const pid = currentPuzzleId.value!;
      if (!progress.value.completed.includes(pid)) progress.value.completed.push(pid);
      const prevStars = progress.value.stars[pid] ?? 0;
      if (res.stars > prevStars) progress.value.stars[pid] = res.stars;
      const prevBest = progress.value.bestScore[pid] ?? 0;
      if (res.score > prevBest) progress.value.bestScore[pid] = res.score;
      persistProgress();
      sound.win();
      screen.value = "RESULT";
    } else {
      const v = explainViolation(puzzle.value, answer);
      lastViolation.value = { message: v.message };
      errors.value += 1;
      sound.wrong();
      // 留在 PLAYING，UI 显示错误分析（可撤销/继续）。计时保持运行。
    }
  }

  function dismissViolation(): void {
    lastViolation.value = null;
  }

  function nextPuzzle(): void {
    const ch = currentChapter.value;
    if (!ch || !currentPuzzleId.value) {
      screen.value = "CHAPTER_SELECT";
      return;
    }
    const idx = ch.puzzleIds.indexOf(currentPuzzleId.value);
    if (idx >= 0 && idx < ch.puzzleIds.length - 1) {
      startPuzzle(ch.puzzleIds[idx + 1]);
    } else {
      screen.value = "CHAPTER_SELECT";
    }
  }

  function toggleColorBlind(): void {
    settings.value.colorBlind = !settings.value.colorBlind;
    persistSettings();
  }
  function toggleLargeFont(): void {
    settings.value.largeFont = !settings.value.largeFont;
    persistSettings();
  }
  function toggleReduceShake(): void {
    settings.value.reduceShake = !settings.value.reduceShake;
    persistSettings();
  }
  function setVolume(v: number): void {
    settings.value.sfxVolume = v;
    persistSettings();
  }

  return {
    screen,
    chapters,
    totalPuzzles,
    currentChapter,
    selectedChapterId,
    currentPuzzleId,
    puzzle,
    board,
    elapsedMs,
    errors,
    hintsUsed,
    hints,
    lastViolation,
    lastResult,
    settings,
    progress,
    canSubmit,
    goMenu,
    openChapters,
    selectChapter,
    startPuzzle,
    beginPlay,
    markCharacter,
    markStatement,
    setNote,
    undo,
    clearBoard,
    requestHint,
    submit,
    dismissViolation,
    nextPuzzle,
    toggleColorBlind,
    toggleLargeFont,
    toggleReduceShake,
    setVolume,
  };
});
