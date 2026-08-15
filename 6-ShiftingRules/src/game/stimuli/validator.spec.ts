import { describe, it, expect } from "vitest";
import { Rng } from "../rng";
import { validateRuleSet } from "./validator";
import { PACKS, LOAD_ERRORS } from "../../data/packs";

describe("规则包整体加载", () => {
  it("5 个包全部编译且无加载错误", () => {
    expect(PACKS.length).toBe(5);
    expect(LOAD_ERRORS).toHaveLength(0);
  });
});

describe("大规模唯一性校验 (文档 §8.4：≥10000 刺激验证唯一动作)", () => {
  for (const p of PACKS) {
    it(`${p.id} (${p.name})：20000 刺激无冲突、无不可达规则、动作唯一`, () => {
      const report = validateRuleSet(p.ruleset.rules, new Rng(0x1234 + p.id.length), 20000);
      expect(report.conflicts).toHaveLength(0);
      expect(report.unreachable).toHaveLength(0);
      expect(report.distinctActions).toBeGreaterThanOrEqual(1);
      expect(report.distinctActions).toBeLessThanOrEqual(3);
      // 动作种类至少应包含 LEFT/RIGHT（基础包应可形成非 SKIP 回合）
      expect(report.distinctActions).toBeGreaterThanOrEqual(2);
    });
  }
});
