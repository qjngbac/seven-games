import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { CommandRecord, GameState, ItemInstance, Level, Operation, OperationResult, Solution } from '../logic/schema';
import { ITEM_DEFS, TAG_LABELS, instanceName } from '../data/items';
import { initState, applyOperation } from '../logic/engine';
import { evaluateSolutions } from '../logic/solutions';
import { CommandHistory, cloneState } from '../logic/command';
import { computeScore, computeStars, summarize, type ScoreSummary } from '../logic/scoring';
import { ALL_LEVELS, getLevel, levelsByChapter } from '../puzzle/repository';
import { audio } from './audio';

export type Screen = 'MENU' | 'LEVEL_SELECT' | 'BRIEFING' | 'PLAY' | 'RESULT' | 'GALLERY' | 'SETTINGS';

interface Progress {
  completed: string[];
  stars: Record<string, number>;
  best: Record<string, number>;
}
interface GalleryEntry {
  recipeId: string;
  note: string;
  count: number;
  /** 人类可读标题（触发时按实际物品生成）；旧存档可能缺失，需用 fallbackTitle 兜底 */
  title?: string;
}
interface Settings {
  fontSize: 'normal' | 'large';
  colorblind: boolean;
  noShake: boolean;
  volume: number;
  muted: boolean;
}

const PROGRESS_KEY = 'rtb_progress';
const GALLERY_KEY = 'rtb_gallery';
const SETTINGS_KEY = 'rtb_settings';

/** 全关卡配方索引：图鉴旧存档缺少标题时，按输入标签回退生成中文标题 */
const RECIPE_BY_ID: Record<string, import('../logic/schema').Recipe> = {};
for (const lv of ALL_LEVELS) for (const r of lv.recipes) RECIPE_BY_ID[r.recipeId] = r;

function save(key: string, val: unknown): void {
  try {
    localStorage.setItem(key + '.tmp', JSON.stringify(val));
    localStorage.setItem(key, JSON.stringify(val));
    localStorage.removeItem(key + '.tmp');
  } catch {
    /* 存储不可用时静默降级 */
  }
}
function load<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const useGame = defineStore('game', () => {
  const screen = ref<Screen>('MENU');
  const level = ref<Level | null>(null);
  const state = ref<GameState | null>(null);
  const records = ref<CommandRecord[]>([]);
  const lastResult = ref<OperationResult | null>(null);
  const solution = ref<Solution | null>(null);
  const resultSummary = ref<ScoreSummary | null>(null);
  const resultScore = ref(0);
  const resultStars = ref(0);
  const selected = ref<string[]>([]); // 选中的背包实例 id（用于组合/检查）
  const tutorialDone = ref(load<boolean>('rtb_tutorial', false));

  const progress = ref<Progress>(load<Progress>(PROGRESS_KEY, { completed: [], stars: {}, best: {} }));
  const gallery = ref<Record<string, GalleryEntry>>(load<Record<string, GalleryEntry>>(GALLERY_KEY, {}));
  const settings = ref<Settings>(
    load<Settings>(SETTINGS_KEY, { fontSize: 'normal', colorblind: false, noShake: false, volume: 0.6, muted: false })
  );

  let history = new CommandHistory();

  // 同步音频设置
  audio.setVolume(settings.value.volume);
  audio.setMuted(settings.value.muted);

  const chapterGroups = computed(() => levelsByChapter());
  const inventory = computed<ItemInstance[]>(() => state.value?.inventory ?? []);
  const scene = computed(() => state.value?.scene ?? {});
  const flags = computed(() => state.value?.flags ?? {});
  const canUndo = computed(() => history.canUndo);
  const canRedo = computed(() => history.canRedo);
  const solved = computed(() => solution.value !== null);
  const galleryList = computed(() => Object.values(gallery.value).sort((a, b) => b.count - a.count));
  const galleryCount = computed(() => Object.keys(gallery.value).length);
  const totalLevels = ALL_LEVELS.length;
  const completedCount = computed(() => progress.value.completed.length);

  function persistSettings(): void {
    audio.setVolume(settings.value.volume);
    audio.setMuted(settings.value.muted);
    save(SETTINGS_KEY, settings.value);
  }

  function goMenu(): void {
    screen.value = 'MENU';
  }
  function goLevelSelect(): void {
    screen.value = 'LEVEL_SELECT';
  }
  function openBriefing(id: string): void {
    const lv = getLevel(id);
    if (!lv) return;
    level.value = lv;
    screen.value = 'BRIEFING';
  }
  function startLevel(id: string): void {
    const lv = getLevel(id);
    if (!lv) return;
    level.value = lv;
    state.value = initState(lv);
    history = new CommandHistory();
    records.value = [];
    lastResult.value = null;
    solution.value = null;
    resultSummary.value = null;
    selected.value = [];
    screen.value = 'PLAY';
  }
  function resetLevel(): void {
    if (!level.value) return;
    state.value = initState(level.value);
    history = new CommandHistory();
    records.value = [];
    lastResult.value = null;
    solution.value = null;
    resultSummary.value = null;
    selected.value = [];
    audio.play('undo');
  }

  function toggleSelect(instanceId: string): void {
    const i = selected.value.indexOf(instanceId);
    if (i >= 0) selected.value.splice(i, 1);
    else selected.value.push(instanceId);
    audio.play('pick');
  }
  function clearSelect(): void {
    selected.value = [];
  }

  function addGallery(recipeId: string, note: string, title?: string): void {
    const ex = gallery.value[recipeId];
    if (ex) {
      ex.count += 1;
      if (!ex.title && title) ex.title = title;
    } else {
      gallery.value[recipeId] = { recipeId, note, count: 1, ...(title ? { title } : {}) };
    }
    save(GALLERY_KEY, gallery.value);
  }

  /** 按实际操作生成图鉴标题：组合显示「A × B」，使用显示「A → 目标」 */
  function opTitle(op: Operation): string | undefined {
    if (!state.value || !level.value) return undefined;
    if (op.kind === 'combine') {
      const names = op.instanceIds
        .map((id) => {
          const inst = state.value!.inventory.find((i) => i.instanceId === id);
          return inst ? instanceName(inst) : null;
        })
        .filter((n): n is string => !!n);
      return names.length >= 2 ? names.join(' × ') : undefined;
    }
    if (op.kind === 'use') {
      const inst = state.value.inventory.find((i) => i.instanceId === op.instanceId);
      const tgt = level.value.targets.find((t) => t.id === op.targetId);
      if (inst && tgt) return `${instanceName(inst)} → ${tgt.name}`;
    }
    return undefined;
  }

  /** 旧存档无标题时，按配方输入回退生成中文标题 */
  function fallbackTitle(recipeId: string): string {
    const r = RECIPE_BY_ID[recipeId];
    if (!r) return recipeId;
    const parts = r.inputs
      .map((inp) => {
        if (inp.item) return ITEM_DEFS[inp.item]?.name ?? inp.item;
        if (inp.tag) return TAG_LABELS[inp.tag] ?? inp.tag;
        return '';
      })
      .filter(Boolean);
    return parts.length ? parts.join(' × ') : recipeId;
  }

  function doOperation(op: Operation): void {
    if (!state.value || !level.value) return;
    audio.resume();
    const { result, next } = applyOperation(ITEM_DEFS, level.value, state.value, op);
    const before = cloneState(state.value);
    const record: CommandRecord = { before, operation: op, after: next, result };
    history.push(record);
    records.value = [...history.applied];
    state.value = next;
    lastResult.value = result;
    selected.value = [];

    if (result.galleryNote && result.recipe) addGallery(result.recipe.recipeId, result.galleryNote, opTitle(op));

    const cat = result.recipe?.category;
    if (cat === 'solution') audio.play('success');
    else if (cat === 'neutral') audio.play('combine');
    else if (result.kind === 'failure') audio.play('failure');
    else audio.play('error');

    const sol = evaluateSolutions(level.value.solutions, next);
    if (sol) win(sol);
  }

  function combine(ids: string[]): void {
    if (ids.length < 2) return;
    doOperation({ kind: 'combine', instanceIds: ids });
  }
  function useOn(instanceId: string, targetId: string, verb?: 'use'): void {
    doOperation({ kind: 'use', instanceId, targetId, verb });
  }

  function undo(): void {
    const prev = history.undo();
    if (!prev) return;
    state.value = prev;
    records.value = [...history.applied];
    lastResult.value = null;
    solution.value = null;
    audio.play('undo');
  }
  function redo(): void {
    const nxt = history.redo();
    if (!nxt) return;
    state.value = nxt;
    records.value = [...history.applied];
    lastResult.value = null;
    audio.play('combine');
  }

  function dismissResult(): void {
    lastResult.value = null;
  }

  function win(sol: Solution): void {
    const summary = summarize(records.value);
    const score = computeScore(sol.tier, summary);
    const stars = computeStars(sol.tier, summary.errors);
    resultSummary.value = summary;
    resultScore.value = score;
    resultStars.value = stars;
    solution.value = sol;
    const id = level.value!.id;
    if (!progress.value.completed.includes(id)) progress.value.completed.push(id);
    progress.value.stars[id] = Math.max(progress.value.stars[id] ?? 0, stars);
    progress.value.best[id] = Math.max(progress.value.best[id] ?? 0, score);
    save(PROGRESS_KEY, progress.value);
    audio.play('win');
    screen.value = 'RESULT';
  }

  function nextLevel(): void {
    if (!level.value) return goLevelSelect();
    const idx = ALL_LEVELS.findIndex((l) => l.id === level.value!.id);
    const nxt = ALL_LEVELS[idx + 1];
    if (nxt) startLevel(nxt.id);
    else goLevelSelect();
  }

  function finishTutorial(): void {
    tutorialDone.value = true;
    save('rtb_tutorial', true);
  }

  return {
    screen, level, state, records, lastResult, solution, resultSummary, resultScore, resultStars,
    selected, tutorialDone, progress, gallery, settings, chapterGroups,
    inventory, scene, flags, canUndo, canRedo, solved, galleryList, galleryCount, totalLevels, completedCount,
    goMenu, goLevelSelect, openBriefing, startLevel, resetLevel, toggleSelect, clearSelect,
    combine, useOn, undo, redo, dismissResult, nextLevel, finishTutorial, persistSettings, fallbackTitle,
  };
});
