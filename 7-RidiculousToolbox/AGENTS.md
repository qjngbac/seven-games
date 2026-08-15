# AGENTS.md — 离谱工具箱

物品组合解谜游戏。玩家从背包选物品，进行「组合」或「用于场景热点」，系统依据**配方 / 标签 / 场景条件**产生结果，目标是让场景达到某个终态（多解并存：专业 / 临时 / 离谱）。

## 先理解产品，再写代码

- 游戏鼓励实验，但不是随机乱点。物品拥有**稳定标签与属性**（fan / adhesive / liquid / electronic…），配方和场景交互必须从这些属性得到解释。每件物品描述提示用途但不直接给答案。
- 关卡成功由**最终状态判断**，因此允许多条路径。失败反馈也属于内容，应告诉玩家为什么不工作或产生什么荒诞后果。
- 规则层（src/logic）必须可脱离界面运行单元测试；UI（src/components）只负责呈现与输入。

## 关键约定

- **数据驱动**：新增关卡/物品/配方只改 `src/data/`，不要在主程序写死 if-else。
- **ItemDefinition 与 ItemInstance 分离**：类型不可变，实例状态（如 `{wired:true}`）不写回定义。
- **配方匹配**（src/logic/recipes.ts）：先按标签/物品匹配输入 → 过滤场景条件 → 取唯一最高优先级。同输入+目标+同优先级多条会在加载期（validator）报错。
- **解法谓词**（src/logic/solutions.ts）：基于 `GameState` 递归求值；解法等级由配方写入的 `solvedTier` 标记区分，避免互相覆盖。
- **撤销**：每次操作是快照命令（src/logic/command.ts），误用关键物品可撤销或重置，不会出现不可恢复死局。

## 改代码前请做

1. 先读 `src/logic/schema.ts` 与现有 `src/data/levels.ts` 理解数据结构。
2. 改动后运行 `npm test`（含 16 关批量唯一匹配 + 可达性 + 章节分组 4×4）与 `npm run typecheck`。
3. 新增配方时注意：输入用 `tag` 或 `item`；工具类输入设 `consumed:false`；失败配方可省略 `outputs`（仅文字反馈）；同一关内不同配方要保证输入签名 + 目标 + 优先级不冲突。
4. 任何 AI 生成关卡必须经 validator + reachability 校验（见 `src/puzzle/`）。
