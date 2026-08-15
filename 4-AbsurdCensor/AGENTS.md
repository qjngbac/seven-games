# AGENTS.md · 荒诞审查局（AbsurdCensor）

Vue 3 + TS + Vite + Pinia 网页游戏。规则核对/文件审查类（类《请出示证件》荒诞风）。
设计文档：`documents/04_有限信息审查游戏_开发文档.docx`（首选 Godot，替代路线 Vue3 卡片式，本实现采用替代路线）。

## 核心架构原则（务必遵守）

- **RuleEvaluator 是唯一事实来源**：合法性由结构化规则 DSL 计算，绝不写死。错误靠字段逻辑差异（姓名/机构/电量/有效期/一致性），不用像素级刁难。
- **优先级评估**（`src/game/rules.ts`）：`active = filter(matchesContext).sort(priority asc)` 后逐条 `apply`。初始策略默认「拒绝」合法、「放行」需规则允许——保证每申请者至少一个合法裁决。
- **合法 ≠ 道德**：`RuleEvaluator`（`rules.ts`）只判制度正确性；`NarrativeEngine`（`narrative.ts`）单独处理 storyTags 延迟后果与多结局（7 种），二者不混。
- **数据驱动**：规则在 `src/data/days.ts`（7 天），申请者在 `src/data/cases.ts`（40 名）。每人 `expected` 由 `buildCase` 调 `evaluate` 反向计算，由 `rules.spec.ts` 批量复核（设计文档 5.2）。

## 目录职责

- `src/game/types.ts` —— 数据模型（Rule/DayRules/ApplicantCase/CaseDocument/Decision/EvalResult/DayResult）。
- `src/game/rules.ts` —— RuleEvaluator + 规则 apply；`evaluate()` 返回 `{allowLegal, denyLegal, detainLegal, reasons}`。
- `src/game/desk.ts` —— DeskController：当天队列、裁决判定、日结统计（不实现字段比较，交给 RuleEvaluator）。
- `src/game/narrative.ts` —— buildDayEvents / resolveEnding / mergeDay。
- `src/data/days.ts` —— 7 天规则（优先级 10-100；例外用 100）。
- `src/data/cases.ts` —— 40 名申请者，`CASES` / `casesForDay`；`buildCase` 反向验证 expected。
- `src/store.ts` —— Pinia：FSM（menu→brief→desk→feedback→dayend→ending）、跨天累计（orgPressure/conscience/工资）、结局。
- `src/components/` —— 全部 UI（卡片式工作台，含 HUD/文件卡/规则书/印章/反馈覆盖层/日结/结局）。

## 扩展指引

- 加一天规则：在 `days.ts` 加 `DayRules`（注意 `today` 字段供有效期用），规则加 `isNew` 标记。
- 加一名申请者：在 `cases.ts` 的 `RAW` 加条目（带 `day`），`expected` 由引擎自动算，测试会验证合法性。
- 加规则类型：在 `types.ts` 的 `RuleOp` 增枚举 + `rules.ts` 的 `applyRule` 加分支 + 测试。
- 文档 id 约定：access_pass 文档 id=`pass`（字段 name/issuer）、application=`app`（name/purpose/origin）、charge_cert=`charge_cert`（level）、work_permit=`work_permit`（valid）、contraband=`contraband`。when 条件基于 `person` 属性（species/carries/origin/purpose）。

## 验证状态

- 测试 15/15 通过；`vue-tsc` 零错误；`vite build` 成功（~111 KB / gzip 42 KB）。
- 7 天 / 40 名申请者 / 8 类规则 / 7 种结局。
- 预览：`npm run serve` → http://127.0.0.1:5188/
