# AGENTS.md — 《这里有人在说谎》项目理解（写给 AI 协作者）

这是一款**确定性逻辑谜题游戏**，不是凭剧情感觉猜人的游戏。任何正确答案都必须由
结构化规则推出。中文台词只是显示层，真正逻辑由 `logic/ast.ts` 的 AST 与 `puzzle/` 的
约束定义。AI 可以帮写台词和模板，但**绝不能替代求解器**。

## 必须守住的不变量

- 每个谜题在加载时由 `puzzle/validator.ts` 验证解数量：**正式关卡必须唯一解**。
  多解/无解/自指循环的内容会被标记错误并跳过，不进入可玩列表。
- 陈述同时有 `text`（展示）和 `expr`（AST），二者语义必须一致（台词由模板生成，保证一致）。
- 玩家的推理板（`features/board`）只保存判断，绝不修改谜题真相。
- 评分与判定全部走本地确定性代码；不要引入运行时大模型判断答案。

## 关键模块职责（勿越界）

- `logic/evaluator.ts`：在候选世界算命题真假，**不搜索答案**。处理 eqTruth/xorTruth/
  stmtTruth 等引用时用 fixpoint 迭代，无法收敛即 `illformed`（自指循环）。
- `logic/solver.ts`：枚举世界 + 约束过滤，返回解集合；`solve()` 的 `status` 为
  unique/multiple/none/illformed。`answerMatchesSolution()` 判定过关。
- `logic/explainer.ts`：错误分析（指出违反的约束）、推理链、三级提示合成。
- `puzzle/repository.ts`：加载 JSON、分组、dev 暴露全部解。**修改内容后必须重跑批量验证。**
- `game/store.ts`：Pinia 状态机（九屏流程）。UI 永远不直接改谜题，只调 store action。

## 新增/修改关卡的正确流程

1. 想加谜题：在 `src/dev/generator.ts` 的 `CHAPTER_SPECS` 调整配置，或新增章节，
   然后 `GEN=1 npx vitest run src/dev/generate.spec.ts` 重新生成 `src/data/puzzles/*.json`。
   **不要手工写多解谜题**——生成器用求解器保证唯一解。
2. 改完跑 `npm test`（含 `src/data/content.spec.ts` 的 20 关唯一解批量验证）、
   `npm run typecheck`、`npm run build`，全绿再交付。
3. 单关手验：可临时在 `game/store.ts` 之外用 `solve(puzzle)` 打印全部解核对。

## 常见失败与规避（见开发文档 §11）

- 多解谜题：看似合理但无法唯一确定 → 一律用生成器/求解器验证。
- 台词与逻辑不一致：玩家按文字推出不同答案 → 台词从受控模板生成。
- 难度来自文字绕：限制句式，难度放在约束组合。
- 提示不可靠：提示由唯一解合成，对全部合法解成立。
- 解释太技术化：解释器输出自然语言矛盾链，不是布尔表达式。

## 运行/验证命令

```bash
npm run dev          # 热更预览
npm run build        # 类型检查 + 构建
npm test             # 全部单测（含内容批量验证）
GEN=1 npx vitest run src/dev/generate.spec.ts   # 重新生成谜题
node serve.cjs 5185  # 预览 dist
```
