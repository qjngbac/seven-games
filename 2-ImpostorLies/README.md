# 这里有人在说谎（ImpostorLies）

伪装者逻辑推理游戏 · 确定性求解器 + Vue 3 + TypeScript + Vite

> 核心不是「凭感觉猜人」，而是**用公开规则推出唯一答案**。每关的角色陈述同时保存
> 「展示文本」和「结构化逻辑 AST」，所有答案都由本地确定性代码算出，绝不依赖大模型运行时判断。

## 快速开始

```bash
npm install          # 安装依赖（vue / pinia / vite / vitest / typescript）
npm run dev          # 开发热更预览（默认 http://localhost:5173）
npm run build        # 类型检查 + 生产构建，产出 dist/
node serve.cjs 5185  # 静态预览已构建产物（http://localhost:5185/）
npm test             # 运行全部单元测试（含 32 关批量唯一解验证）
npm run typecheck    # 仅类型检查
```

> 注：若 `npm run build` 在清空 `dist` 时遇到沙箱 safe-delete 拦截报错（非代码问题），
> 先 `rm -rf dist` 再重新构建即可。

## 架构（严格分层，逻辑层零 UI 依赖）

```
src/
  logic/                  # 纯逻辑内核（可被求解器/测试直接调用，无 Vue 依赖）
    ast.ts                # 命题 AST：roleIs / roleCount / sameRole / not / and / or / eqTruth / xorTruth / stmtTruth
    evaluator.ts          # 在候选世界求命题真假；fixpoint 处理陈述互相引用，检测自指循环
    solver.ts             # 枚举角色身份组合 → 求各陈述真假 → 应用约束 → 收集解；唯一解检测
    explainer.ts          # 矛盾链（错误分析）/ 推理链 / 三级提示（均由唯一解推导）
  puzzle/
    schema.ts             # 谜题 JSON 形状校验
    validator.ts          # 引用/唯一解/自指 深度校验；错误内容跳过不发布
    repository.ts         # 加载 8 章 JSON、分组、dev 暴露全部解
  features/
    board/board.ts        # 玩家推理板：标记 + 撤销栈 + 按「恰好 N」约束自动推导
    hints/hints.ts        # 三级提示（从唯一解合成，对全部解成立）
  game/
    scoring.ts            # 评分（用时/提示/错误）
    settings.ts           # 设置 + 进度，事务式 localStorage 存档
    audio.ts              # WebAudio 合成音效（无音频资源文件）
    store.ts              # Pinia 状态机：菜单→章节→关卡说明→推理→校验→错误分析/结算
  data/puzzles/           # 32 关内容（8 章 × 4 关），由生成器产出并验证唯一解
  dev/generator.ts        # 谜题生成器（开发期工具 / 批量求解校验）
  components/             # Vue 界面：主菜单/章节/关卡说明/推理主界面/结算
  App.vue / main.ts / styles.css
```

## 玩法

1. 读规则（如「恰好 1 个伪装者」「恰好 N 句真话」「伪装者永远说谎」）。
2. 给每条陈述标记**真/假/未知**，给每个人标记**身份**。
3. 提交。错了会告诉你**违反了哪条规则**（矛盾链），可撤销重试；不靠猜。
4. 卡住可要**三级提示**（扣分但不阻断）。通关展示**最短推理链**与唯一解。

## 内容生产：正确性即玩法

32 关由 `src/dev/generator.ts` 用求解器当「预言机」自动搜索——只保留「能在目标世界成为解、
且求解器判定为唯一解」的谜题，避免手工写出多解/无解内容。运行：

```bash
GEN=1 npx vitest run src/dev/generate.spec.ts
```

八章渐进难度：经典真假话 / 陈述互相引用 / 身份决定说话规则 /
量词变体（多伪装者+恰好 N 真）/ 全员身份谜（身份互不相同）/
五人剧本杀（恰好 1 伪装者）/ 双重间谍（2 个伪装者）/ 末日方舟（四人身份谜）。

## 验证结果

- `npm test`：**32/32 通过**——逻辑内核（无解/多解/唯一解、嵌套 not/and/or、eqTruth、
  自指循环检测）、推理板、评分、解释器，以及**32 关批量求解全部唯一解、无校验错误**。
- `npm run typecheck`、`npm run build`：通过（JS ~132 KB / gzip 45 KB）。
- 可访问性：色弱模式（颜色+文字/形状双编码）、大字号、减少抖动、键盘操作为主。

## 可访问性 / 设置

色弱模式、大字号、减少画面抖动、音效音量，均在主菜单「⚙ 设置」中调整，存档事务式写入。
