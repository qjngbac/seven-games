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
