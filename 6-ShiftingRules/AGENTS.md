# 项目理解（给 AI 协作者的说明）

这是《规则正在跑路》——一款**规则变化反应判断**网页游戏。先理解产品，再堆代码。

## 它到底是什么

不是纯手速测试。核心是把「当前刺激」经过**规则优先级计算**归约成**唯一动作**。规则配置是唯一事实来源：展示文本、教学示例、求值器都从同一份规则数据产生。任何会导致「多个正确动作」或「无法判断」的刺激，必须在生成与加载阶段被拒绝。

## 架构铁律

1. **规则层是纯的**：`src/game/rules/*`、`src/game/stimuli/*`、`src/game/scoring/*`、`src/game/session.ts`、`src/game/rng.ts` 绝不 import Phaser / DOM。它们可在 node 下单测、可重放。
2. **数据驱动**：规则写在 `src/data/rule-packs/*.json`，用 `compiler.ts` 规范化、校验；新增规则只改 JSON，不要改逻辑。
3. **唯一动作不变量**：`evaluator.evaluate` 对任一刺激必返回唯一 `Action`（LEFT/RIGHT/SKIP）；INVERT_BASE 是修饰型（互换 LEFT/RIGHT），设定型动作直接覆盖。
4. **固定种子可重放**：`GameSession` 的生成只依赖种子与内部覆盖度选择，与玩家输入无关。改生成逻辑必须保证重放测试仍通过。

## 验收清单（来自开发文档 §10）

- 每轮恰好一个正确输入；规则变化提前展示并给练习（RuleChange 场景）。
- 反应速度与逻辑判断同时计分；错误先清空连击再轻微扣分。
- 视觉干扰不破坏可访问性（颜色配文字/形状）。
- 错误反馈显示「命中的规则 → 优先级 → 正确动作」，不只闪红。
- 同优先级冲突在加载时阻止进入；生成器只产出唯一可判定回合。
- 存档写入事务式（临时键→主键→删临时），异常退出不损坏。

## 加内容的正确姿势

- 加规则：在对应 `pack-*.json` 追加一个 `{id, predicate(简写), action, priority, text, example}` 对象；**确保每个规则优先级唯一或互斥**，否则 `compiler` 会在加载期拦截。
- 加规则包：新建 `pack-*.json`，在 `src/data/packs.ts` 的 `SOURCES` 数组登记。
- 任何改动后跑 `npm test` 与 `npm run build`，并区分「已验证」与「未验证」。

## 常用命令

`npm run dev`（热更） · `npm run build`（类型检查+构建） · `npm test`（规则层单测） · `npm run typecheck`。
