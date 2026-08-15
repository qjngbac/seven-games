// 设置：音量、色弱模式、大字号、减少抖动。事务式写入防止异常退出损坏。
export interface Settings {
  sfxVolume: number; // 0..1
  colorBlind: boolean;
  largeFont: boolean;
  reduceShake: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  sfxVolume: 0.7,
  colorBlind: false,
  largeFont: true,
  reduceShake: false,
};

const SETTINGS_KEY = "impostor-lies:settings";
const TMP_KEY = "impostor-lies:settings:tmp";

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, val: string): void {
  try {
    localStorage.setItem(key, val);
  } catch {
    /* 忽略写入失败（隐私模式等） */
  }
}
function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

export function loadSettings(): Settings {
  const raw = safeGet(SETTINGS_KEY);
  if (raw) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      /* 损坏则用默认 */
    }
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(s: Settings): void {
  // 事务式：先写临时键，校验成功再覆盖主键，最后清理临时键
  const json = JSON.stringify(s);
  safeSet(TMP_KEY, json);
  safeSet(SETTINGS_KEY, json);
  safeRemove(TMP_KEY);
}

// 进度存档
export interface Progress {
  completed: string[]; // 已通关 puzzleId
  stars: Record<string, number>; // puzzleId -> 星数
  bestScore: Record<string, number>;
}

const PROGRESS_KEY = "impostor-lies:progress";
const PROGRESS_TMP = "impostor-lies:progress:tmp";

export function loadProgress(): Progress {
  const raw = safeGet(PROGRESS_KEY);
  if (raw) {
    try {
      return { completed: [], stars: {}, bestScore: {}, ...JSON.parse(raw) };
    } catch {
      /* noop */
    }
  }
  return { completed: [], stars: {}, bestScore: {} };
}

export function saveProgress(p: Progress): void {
  const json = JSON.stringify(p);
  safeSet(PROGRESS_TMP, json);
  safeSet(PROGRESS_KEY, json);
  safeRemove(PROGRESS_TMP);
}
