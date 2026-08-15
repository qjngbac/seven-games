import { describe, it, expect } from "vitest";
import { CONTENT, CONTENT_ERRORS, CONTENT_STATS, CHAPTERS, reportContent } from "../puzzle/repository";
import { solve } from "../logic/solver";

describe("内容批量验证（全部关卡必须唯一解）", () => {
  it("加载到预期数量的谜题，无校验错误", () => {
    // 每章 4 关，章节数随扩展变化，按实际章节数推导期望值
    const expected = CHAPTERS.length * 4;
    // 调试输出
    // eslint-disable-next-line no-console
    console.log("[CONTENT]", reportContent());
    expect(CONTENT_STATS.total).toBe(expected);
    expect(CONTENT_ERRORS.filter((e) => e.level === "error").length).toBe(0);
    expect(CONTENT.size).toBe(expected);
  });

  it("每章恰好 4 关", () => {
    for (const ch of CHAPTERS) {
      expect(ch.puzzleIds.length, `${ch.id} 应有 4 关`).toBe(4);
    }
  });

  it("第八章菜单说明与四人身份谜玩法一致", () => {
    const chapter = CHAPTERS.find((ch) => ch.id === "ch8");
    expect(chapter?.mechanic).toContain("四人版");
    expect(chapter?.mechanic).not.toContain("医护");
  });

  it("每个正式谜题求解器判定为唯一解", () => {
    for (const p of CONTENT.values()) {
      const r = solve(p);
      expect(r.status, `${p.id} 应为唯一解，实际 ${r.status}(${r.solutions.length})`).toBe("unique");
      expect(r.illformed, `${p.id} 不应有自指/循环`).toBe(false);
    }
  });

  it("提示对唯一解成立：generateHints 不为空", () => {
    for (const p of CONTENT.values()) {
      const sol = solve(p).solutions[0];
      expect(sol).toBeTruthy();
    }
  });
});
