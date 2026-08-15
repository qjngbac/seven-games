# 离谱工具箱（Ridiculous Toolbox）

物品组合 / 场景解谜 / 多解法 / 搞笑。把看似无关的物品**组合**或**用于**场景热点，以专业、临时、或离谱但有效的方式解决问题。

> 按 `documents/07_物品组合解谜游戏_开发文档.docx` 实现（M0–M4 全量）。技术路线采用文档推荐的替代方案：**Vue 3 + TypeScript**（卡片 + 场景热点），数据驱动、可测。

## 运行

```bash
# 依赖已随仓库附 node_modules（与 2-ImpostorLies 同版本：vue3 / vite5 / pinia2 / vitest1 / ts5）
npm run dev        # 开发服务器（vite，端口 5173）
npm run build      # 类型检查 + 生产构建到 dist/
npm run serve      # 静态预览（serve.cjs，默认 5186）
npm test           # 运行全部单元测试（含 16 关批量唯一匹配 + 可达性验证）
```

## 玩法

- 看右上角**目标**与场景**热点**（服务器 / 水管 / 门…）。
- 背包点选物品：**选 1 件**再点热点 = 把物品**用于**热点；**选 2 件**再点「组合」= 组合。
- 每件物品有固定**标签**（fan / adhesive / liquid…），组合与反馈都从标签解释；同一问题常有专业/临时/离谱多种解法。
- 所有操作可**撤销/重做/重置**；独特失败会进**离谱图鉴**。

## 内容

16 关（4 章，每章 4 关），每关含专业 / 临时 / 离谱三解 + 8+ 独特失败反馈：

- **第一章**：1. 服务器过热 · 2. 漏水水管 · 3. 遥控器没电 · 4. 水龙头滴水
- **第二章**：5. 门锁坏了 · 6. 黑暗房间 · 7. 显示器不亮 · 8. 自行车爆胎
- **第三章**：9. 火灾警报误报 · 10. 卡住的抽屉 · 11. 打印机卡纸 · 12. 键盘进水
- **第四章**：13. 手机没电 · 14. 堵住的马桶 · 15. 鱼缸漏水 · 16. 下水道反味

（选择关卡页面按章分组，每章标题为「第N章」；下一关按章节顺序推进。）

## 验证结果

- `npm test`：**23/23 通过**——规则内核（组合匹配 / 条件 / 优先级 / 工具不消耗 / 通用失败）、评分、撤销重做、校验器（冲突+引用完整性）、章节分组（4 章 × 4 关），以及 **16 关全部唯一匹配且至少一解可达**（BFS 可达性搜索，附解法路径）。
- `npm run typecheck`、`npm run build`：通过（JS ~155 KB / gzip 54 KB）。

## 架构（数据驱动，无写死 if-else）

```
src/
  logic/        规则内核（与界面解耦，可单测）
    schema.ts      类型：ItemDefinition/ItemInstance/Recipe/SceneTarget/Solution/Operation…
    items.ts       物品注册表与实例查询
    recipes.ts     配方匹配器（normalize→匹配输入→条件→唯一最高优先级）
    scene.ts       场景状态谓词递归求值
    solutions.ts   验收：按最终状态取最优解法等级
    command.ts     可撤销命令（快照 + 撤销/重做）
    scoring.ts     专业/安全/搞笑/成本 评分与星级
    feedback.ts    通用失败反馈（按标签）
    engine.ts      执行一次操作，返回结果与新状态
  data/         内容（纯数据）
    items.ts       全局物品类型池（标签固定）
    levels.ts      16 关：场景热点 / 初始物品 / 配方 / 解法谓词 / 简报
    feedback.ts    通用失败规则表
    content.spec.ts 16 关批量校验测试
  puzzle/       开发期工具
    validator.ts   引用完整性 + 优先级冲突 + 至少一解
    reachability.ts BFS 状态空间搜索，证明至少一条解法可达
    repository.ts  加载 / 章节分组 / 内容报告
  game/         Pinia store + 设置 + WebAudio 音效
  components/    MainMenu / LevelSelect / Briefing / PlayScreen / ResultScreen / Gallery / Settings / Tutorial
```

### 设计要点（对应文档）

- **物品类型与实例分离**：`ItemDefinition` 不可变，`ItemInstance` 持有可变状态，绝不写回定义。
- **数据驱动**：配方、场景、关卡、反馈、评分全在 `data/`，新增内容不改逻辑代码。
- **多解法**：关卡完成由**最终场景状态谓词**判断，不绑定操作序列；解法等级由 `solvedTier` 标记区分。
- **反馈即内容**：失败也产生明确反馈，独特失败进图鉴；无精确配方时按标签给通用反馈。
- **可撤销**：每次操作封装为快照命令，避免误用关键物品导致死局（如冰淇淋浇服务器可撤销）。
- **可达性保证**：`reachability.ts` 在测试期对每关 BFS 证明至少一解，杜绝不可解内容。
- **可访问性**：字号、色弱（强化文字标签）、关闭抖动、音量分项、键盘/鼠标均可操作。
