/**
 * 设置与存档 (文档 §6.1 / §10.2)。
 *  - 设置：色弱模式、关闭抖动、音效、字体大小、音量；
 *  - 最佳成绩、每日挑战完成标记；
 *  - 写入采用「临时键 → 主键 → 删临时」的事务式更新，避免异常退出损坏存档。
 * 该模块仅在浏览器运行，使用 localStorage；node 下测试不会触碰它（UI 才引用）。
 */

export interface Settings {
  colorblind: boolean;
  shake: boolean;
  sfx: boolean;
  fontSize: "normal" | "large";
  volume: number; // 0..1
}

const SETTINGS_KEY = "shifting-rules-settings-v1";
const DEFAULTS: Settings = { colorblind: false, shake: true, sfx: true, fontSize: "normal", volume: 0.7 };

// ---------- 事务式读写 ----------
function atomicGet(key: string): string | null {
  try {
    const main = localStorage.getItem(key);
    if (main !== null) return main;
    const tmp = localStorage.getItem(key + ".tmp");
    if (tmp !== null) {
      localStorage.setItem(key, tmp);
      localStorage.removeItem(key + ".tmp");
      return tmp;
    }
  } catch {
    /* 忽略 */
  }
  return null;
}

function atomicSet(key: string, value: string): void {
  try {
    localStorage.setItem(key + ".tmp", value);
    localStorage.setItem(key, value);
    localStorage.removeItem(key + ".tmp");
  } catch {
    /* 忽略 */
  }
}

// ---------- 设置 ----------
let cache: Settings | null = null;

export function loadSettings(): Settings {
  if (cache) return cache;
  const raw = atomicGet(SETTINGS_KEY);
  let next: Settings = { ...DEFAULTS };
  if (raw) {
    try {
      next = { ...DEFAULTS, ...JSON.parse(raw) } as Settings;
    } catch {
      /* 损坏则用默认 */
    }
  }
  cache = next;
  return next;
}

export function saveSettings(s: Settings): void {
  cache = s;
  atomicSet(SETTINGS_KEY, JSON.stringify(s));
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const next = { ...loadSettings(), ...patch };
  saveSettings(next);
  return next;
}

// ---------- 最佳成绩 ----------
export interface BestEntry {
  score: number;
  accuracy: number;
  date: string;
}

const BEST_KEY = "shifting-rules-best-v1";
type BestMap = Record<string, BestEntry>;

function loadBest(): BestMap {
  const raw = atomicGet(BEST_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as BestMap;
  } catch {
    return {};
  }
}

function saveBest(m: BestMap): void {
  atomicSet(BEST_KEY, JSON.stringify(m));
}

export function bestKey(mode: string, pack: string): string {
  return `${mode}:${pack}`;
}

export function getBest(mode: string, pack: string): BestEntry | null {
  return loadBest()[bestKey(mode, pack)] ?? null;
}

export function recordBest(mode: string, pack: string, entry: BestEntry): boolean {
  const m = loadBest();
  const k = bestKey(mode, pack);
  const cur = m[k];
  if (!cur || entry.score > cur.score) {
    m[k] = entry;
    saveBest(m);
    return true;
  }
  return false;
}

// ---------- 每日挑战完成标记 ----------
const DAILY_KEY = "shifting-rules-daily-v1";

export function isDailyDone(seedKey: string): boolean {
  const raw = atomicGet(DAILY_KEY);
  if (!raw) return false;
  try {
    return !!(JSON.parse(raw) as Record<string, boolean>)[seedKey];
  } catch {
    return false;
  }
}

export function markDailyDone(seedKey: string): void {
  let m: Record<string, boolean> = {};
  const raw = atomicGet(DAILY_KEY);
  if (raw) {
    try {
      m = JSON.parse(raw);
    } catch {
      m = {};
    }
  }
  m[seedKey] = true;
  atomicSet(DAILY_KEY, JSON.stringify(m));
}
