// 存档服务：localStorage + saveVersion + 事务式写入（临时键→主键）+ 损坏备份 + 版本迁移。
// 设计原因：文档 §6.1 / §10.1 / §10.2 要求存档有版本、异常退出不损坏、旧档可迁移。
import type { GameState } from "../core/types";
import { SAVE_VERSION } from "../core/state";

const SAVE_KEY = "absurd-decision:save";
const TMP_KEY = "absurd-decision:save.tmp";
const BACKUP_KEY = "absurd-decision:save.bak";

/** 取存储：浏览器用 localStorage，Node/测试用内存垫片（保证逻辑可单测、不崩溃）。 */
function store(): { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void } {
  const g = globalThis as unknown as { localStorage?: Storage };
  if (g.localStorage) return g.localStorage;
  const mem = new Map<string, string>();
  return {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => void mem.set(k, v),
    removeItem: (k) => void mem.delete(k),
  };
}

/** 版本迁移：当前仅 v1，未来版本在此补齐转换。返回 null 表示无法迁移（保留备份，调用方重新开始）。 */
export function migrate(state: GameState): GameState | null {
  if (state.version === SAVE_VERSION) return state;
  if (state.version == null) return null; // 太旧/无版本，无法迁移
  // 未来：if (state.version < SAVE_VERSION) { ...补全字段... }
  return null;
}

export function hasSave(): boolean {
  return store().getItem(SAVE_KEY) != null;
}

/** 事务式写入：先写临时键，再覆盖主键值前把旧值存为备份，最后删除临时键。 */
export function saveGame(state: GameState): { ok: boolean; error?: string } {
  try {
    const json = JSON.stringify(state);
    const s = store();
    s.setItem(TMP_KEY, json);
    const cur = s.getItem(SAVE_KEY);
    if (cur) s.setItem(BACKUP_KEY, cur);
    s.setItem(SAVE_KEY, s.getItem(TMP_KEY) as string);
    s.removeItem(TMP_KEY);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** 读取存档：主键损坏时尝试备份，仍失败则回 null（不抛异常）。 */
export function loadGame(): GameState | null {
  const s = store();
  const tryParse = (raw: string | null): GameState | null => {
    if (!raw) return null;
    try {
      const st = JSON.parse(raw) as GameState;
      return migrate(st);
    } catch {
      return null;
    }
  };
  const main = tryParse(s.getItem(SAVE_KEY));
  if (main) return main;
  const bak = tryParse(s.getItem(BACKUP_KEY));
  if (bak) return bak;
  return null;
}

export function clearSave(): void {
  const s = store();
  s.removeItem(SAVE_KEY);
  s.removeItem(TMP_KEY);
  s.removeItem(BACKUP_KEY);
}
