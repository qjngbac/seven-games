import type { Puzzle, SolveResult } from "../logic/ast";
import { solve } from "../logic/solver";
import { validatePuzzle, type ValidationIssue } from "./validator";
import ch1 from "../data/puzzles/ch1.json";
import ch2 from "../data/puzzles/ch2.json";
import ch3 from "../data/puzzles/ch3.json";
import ch4 from "../data/puzzles/ch4.json";
import ch5 from "../data/puzzles/ch5.json";
import ch6 from "../data/puzzles/ch6.json";
import ch7 from "../data/puzzles/ch7.json";
import ch8 from "../data/puzzles/ch8.json";

export interface Chapter {
  id: string;
  title: string;
  mechanic: string;
  puzzleIds: string[];
}

/** 章节顺序（与生成器一致）。 */
export const CHAPTERS: Chapter[] = [
  { id: "ch1", title: "第一章 · 机房疑云", mechanic: "基础：恰好 1 个伪装者，且只有若干句话为真。", puzzleIds: [] },
  { id: "ch2", title: "第二章 · 外星食堂", mechanic: "进阶：角色会引用彼此的真假（「我和他说的相同/不同」）。", puzzleIds: [] },
  { id: "ch3", title: "第三章 · 办公室政治", mechanic: "规则：伪装者永远说假话（身份决定说话规则）。", puzzleIds: [] },
  { id: "ch4", title: "第四章 · 侦探事务所", mechanic: "量词：可能有多个伪装者，且「恰好 N 人说真话」。", puzzleIds: [] },
  { id: "ch5", title: "第五章 · 全员身份谜", mechanic: "身份谜：每人身份各不相同，伪装者混在其中。", puzzleIds: [] },
  { id: "ch6", title: "第六章 · 密室逃脱", mechanic: "五人剧本杀：恰好 1 个伪装者，且「恰好 N 人说真话」。", puzzleIds: [] },
  { id: "ch7", title: "第七章 · 双重间谍", mechanic: "量词升级：可能有 2 个伪装者，且「恰好 N 人说真话」。", puzzleIds: [] },
  { id: "ch8", title: "第八章 · 末日方舟", mechanic: "身份谜·四人版：每人身份各不相同（船长/领航/工程师/伪装者）。", puzzleIds: [] },
];

const rawPacks = [ch1, ch2, ch3, ch4, ch5, ch6, ch7, ch8] as Puzzle[][];

function build(): {
  puzzles: Map<string, Puzzle>;
  errors: ValidationIssue[];
  stats: { total: number; kept: number };
} {
  const puzzles = new Map<string, Puzzle>();
  const errors: ValidationIssue[] = [];
  let total = 0;
  let kept = 0;
  for (const pack of rawPacks) {
    for (const p of pack) {
      total++;
      const issues = validatePuzzle(p);
      const fatal = issues.filter((i) => i.level === "error");
      if (fatal.length > 0) {
        errors.push(...fatal);
        // 错误内容跳过，不进入可玩列表（文档 §10.1）
        continue;
      }
      if (puzzles.has(p.id)) {
        errors.push({ puzzleId: p.id, level: "error", message: "id 重复，跳过重复定义" });
        continue;
      }
      puzzles.set(p.id, p);
      kept++;
    }
  }
  return { puzzles, errors, stats: { total, kept } };
}

const built = build();
export const CONTENT: Map<string, Puzzle> = built.puzzles;
export const CONTENT_ERRORS: ValidationIssue[] = built.errors;
export const CONTENT_STATS = built.stats;

// 填充章节的 puzzleIds（按文件名顺序）
for (const ch of CHAPTERS) {
  ch.puzzleIds = [...CONTENT.values()]
    .filter((p) => p.id.startsWith(ch.id + "_"))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((p) => p.id);
}

export function getPuzzle(id: string): Puzzle | undefined {
  return CONTENT.get(id);
}

export function allPuzzles(): Puzzle[] {
  return [...CONTENT.values()];
}

/** 开发模式：返回某谜题全部解（用于谜题编辑器展示）。 */
export function devSolutions(id: string): SolveResult | null {
  const p = CONTENT.get(id);
  return p ? solve(p) : null;
}

export function reportContent(): string {
  return JSON.stringify(
    {
      total: CONTENT_STATS.total,
      kept: CONTENT_STATS.kept,
      errors: CONTENT_ERRORS,
      chapters: CHAPTERS.map((c) => ({ id: c.id, count: c.puzzleIds.length })),
    },
    null,
    2,
  );
}
