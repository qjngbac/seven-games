import { test } from "vitest";
import { generateAllPuzzles, CHAPTER_SPECS } from "./generator";

// 仅在 GEN=1 时运行：npx vitest run src/dev/generate.spec.ts -t generate
// 生成并写入 data/puzzles/*.json（八章共 32 个唯一解谜题）。
test("generate puzzles (GEN=1 only)", () => {
  if (process.env.GEN !== "1") return;
  const expected = CHAPTER_SPECS.reduce((a, s) => a + s.perChapter, 0);
  const root = process.cwd();
  const r = generateAllPuzzles(root);
  // eslint-disable-next-line no-console
  console.log("[GENERATE RESULT]", JSON.stringify(r, null, 2));
  if (r.total < expected) {
    throw new Error(`只生成了 ${r.total} 个谜题，期望 ${expected}。失败：${JSON.stringify(r.failed)}`);
  }
});
