import type { ChoiceLogEntry, GameState, ResourceKey } from "../core/types";
import type { EndingInfo } from "../core/game";
import { ENDINGS } from "../core/game";

const HISTORY_KEY = "absurd-decision:history";
const MAX_SAVED_RUNS = 30;

export interface PastRun {
  id: string;
  timestamp: number;
  dateStr: string;
  endingKey: string;
  endingTitle: string;
  endingKind: "win" | "lose";
  honor: string;
  endingText: string;
  day: number;
  maxDays: number;
  traitName: string;
  choicesCount: number;
  finalResources: Record<ResourceKey, number>;
  tags: string[];
  choiceLog: ChoiceLogEntry[];
}

export interface UnlockedEndingRecord {
  count: number;
  firstUnlockedAt: number;
}

export interface HistoryData {
  runs: PastRun[];
  unlockedEndings: Record<string, UnlockedEndingRecord>;
}

function store(): { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void } {
  const g = globalThis as unknown as { localStorage?: Storage };
  if (g.localStorage) return g.localStorage;
  const mem = (g as unknown as { __mem_store?: Map<string, string> }).__mem_store ||= new Map<string, string>();
  return {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => void mem.set(k, v),
    removeItem: (k) => void mem.delete(k),
  };
}

export function getHistoryData(): HistoryData {
  try {
    const raw = store().getItem(HISTORY_KEY);
    if (!raw) return { runs: [], unlockedEndings: {} };
    const parsed = JSON.parse(raw);
    return {
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
      unlockedEndings: parsed.unlockedEndings && typeof parsed.unlockedEndings === "object" ? parsed.unlockedEndings : {},
    };
  } catch {
    return { runs: [], unlockedEndings: {} };
  }
}

export function saveHistoryData(data: HistoryData): void {
  try {
    store().setItem(HISTORY_KEY, JSON.stringify(data));
  } catch {
    // 忽略存储超限等异常
  }
}

export function recordRun(game: GameState, ending: EndingInfo, traitName: string): PastRun {
  const data = getHistoryData();
  const now = new Date();
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const pastRun: PastRun = {
    id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    dateStr,
    endingKey: ending.key,
    endingTitle: ending.title,
    endingKind: ending.kind,
    honor: ending.honor,
    endingText: ending.text,
    day: game.day,
    maxDays: game.maxDays,
    traitName: traitName || "无特质",
    choicesCount: game.choiceLog.length,
    finalResources: { ...game.resources },
    tags: [...game.tags],
    choiceLog: JSON.parse(JSON.stringify(game.choiceLog)),
  };

  data.runs.unshift(pastRun);
  if (data.runs.length > MAX_SAVED_RUNS) {
    data.runs = data.runs.slice(0, MAX_SAVED_RUNS);
  }

  const curEnding = data.unlockedEndings[ending.key];
  if (curEnding) {
    curEnding.count += 1;
  } else {
    data.unlockedEndings[ending.key] = {
      count: 1,
      firstUnlockedAt: Date.now(),
    };
  }

  saveHistoryData(data);
  return pastRun;
}

export function clearHistory(): void {
  store().removeItem(HISTORY_KEY);
}

export function getUnlockedEndingsCount(): number {
  const data = getHistoryData();
  return Object.keys(data.unlockedEndings).length;
}

export function getTotalEndingsCount(): number {
  return Object.keys(ENDINGS).length;
}
