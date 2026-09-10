import type { Level } from '../logic/schema';
import { ITEM_DEFS } from '../data/items';
import { LEVELS } from '../data/levels';
import { validateAll, type ValidationIssue } from './validator';
import { checkAll, type ReachabilityResult } from './reachability';

export const ALL_LEVELS: Level[] = LEVELS;
export const ITEM_POOL = ITEM_DEFS;

export function getLevel(id: string): Level | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function levelsByChapter(): { chapter: number; title: string; levels: Level[] }[] {
  const map = new Map<number, Level[]>();
  for (const l of LEVELS) {
    if (!map.has(l.chapter)) map.set(l.chapter, []);
    map.get(l.chapter)!.push(l);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([chapter, levels]) => ({ chapter, title: `第${chapter}章`, levels }));
}

export interface ContentReport {
  total: number;
  errors: ValidationIssue[];
  reachability: ReachabilityResult[];
  unreachable: string[];
}

/** 批量内容报告：校验 + 可达性（测试与开发期使用） */
export function reportContent(): ContentReport {
  const errors = validateAll(LEVELS);
  const reachability = checkAll(LEVELS);
  const unreachable = reachability.filter((r) => !r.reachable).map((r) => r.levelId);
  return { total: LEVELS.length, errors, reachability, unreachable };
}

/** 关卡静态校验结果（模块加载时算一次） */
export const CONTENT_ISSUES: ValidationIssue[] = validateAll(LEVELS);

/**
 * 加载期内容校验：把"只跑在测试里"的校验提到运行期。
 * - 开发环境：直接抛错，避免带着坏数据进入对局（构建/测试会立刻暴露）；
 * - 生产环境：只打印错误，保证玩家侧游戏始终可运行。
 */
export function assertContentValid(): void {
  const errors = CONTENT_ISSUES.filter((i) => i.severity === 'error');
  if (errors.length === 0) return;
  const msg = errors.map((e) => `[${e.levelId}] ${e.message}`).join('\n');
  const isDev =
    typeof import.meta !== 'undefined' &&
    (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true;
  if (isDev) throw new Error('关卡内容校验失败：\n' + msg);
  // eslint-disable-next-line no-console
  console.error('关卡内容校验失败：\n' + msg);
}

assertContentValid();
