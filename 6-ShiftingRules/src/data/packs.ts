/**
 * 规则包加载与校验 (文档 §5 / §6.1)。
 * 启动时编译所有 JSON 规则包：规范谓词 + 冲突检测；任何包出错都不进入游戏（§5.2）。
 */
import type { RuleSet } from "../game/rules/schema";
import { compileRuleSet, type RawRuleSet } from "../game/rules/compiler";
import { Rng } from "../game/rng";
import { validateRuleSet, type ValidationReport } from "../game/stimuli/validator";
import packBase from "./rule-packs/pack-base.json";
import packParity from "./rule-packs/pack-parity.json";
import packCharacter from "./rule-packs/pack-character.json";
import packText from "./rule-packs/pack-text.json";
import packExtreme from "./rule-packs/pack-extreme.json";

const SOURCES: RawRuleSet[] = [packBase, packParity, packCharacter, packText, packExtreme] as RawRuleSet[];

export interface PackLoad {
  id: string;
  name: string;
  ruleset: RuleSet;
  errors: string[];
  report: ValidationReport;
}

export const PACKS: PackLoad[] = [];
export const LOAD_ERRORS: string[] = [];

for (const raw of SOURCES) {
  const res = compileRuleSet(raw);
  if (!res.ruleset) {
    LOAD_ERRORS.push(`规则包 ${raw.id} 编译失败：${res.errors.join("；")}`);
    continue;
  }
  // 20000 刺激唯一性/冲突/可达性校验
  const report = validateRuleSet(res.ruleset.rules, new Rng(0xc0ffee), 20000);
  if (report.conflicts.length > 0 || report.unreachable.length > 0) {
    LOAD_ERRORS.push(
      `规则包 ${raw.id} 校验异常：冲突 ${report.conflicts.map((c) => c.join("×")).join(",")}；不可达 ${report.unreachable.join(",")}`,
    );
    // 校验异常的包不进入游戏（文档 §5.2）
    continue;
  }
  PACKS.push({ id: res.ruleset.id, name: res.ruleset.name, ruleset: res.ruleset, errors: res.errors, report });
}

export function getPack(id: string): RuleSet | null {
  return PACKS.find((p) => p.id === id)?.ruleset ?? null;
}

export function reportPacks(): string {
  const lines = PACKS.map(
    (p) =>
      `  ${p.id} (${p.name}) 规则${p.ruleset.rules.length}条 难度${p.ruleset.difficulty} | 唯一性OK 动作种类${p.report.distinctActions} 不可达${p.report.unreachable.length} 冲突${p.report.conflicts.length}`,
  );
  return `规则包 ${PACKS.length} 个，加载错误 ${LOAD_ERRORS.length} 个：\n${lines.join("\n")}`;
}
