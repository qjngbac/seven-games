import type { Puzzle } from "../logic/ast";

// 谜题数据契约。真正的逻辑类型在 logic/ast.ts，这里做 JSON 加载期的
// 轻量形状校验，并把 Puzzle 类型集中导出，方便仓库与 UI 引用。
export type { Puzzle } from "../logic/ast";

export const PUZZLE_FILE_VERSION = 1;

/** 极简形状检查：确保核心字段存在且为数组/对象，避免解析阶段直接崩溃。 */
export function isPuzzleLike(obj: unknown): obj is Puzzle {
  if (!obj || typeof obj !== "object") return false;
  const p = obj as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.title === "string" &&
    Array.isArray(p.roles) &&
    Array.isArray(p.constraints) &&
    Array.isArray(p.characters) &&
    Array.isArray(p.statements)
  );
}
