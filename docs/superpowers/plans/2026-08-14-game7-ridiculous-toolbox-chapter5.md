# 物品组合解谜游戏第 5 章实施计划

> **供自动化执行者使用：** 必须使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐项实施本计划。步骤使用复选框（`- [ ]`）跟踪。

**目标：** 新增第 5 章，含四关不同的关卡、每关三个可达的解法档位，以及每关至少八条专属的失败配方。

**架构：** 只扩展已有的物品目录与 `LEVELS` 数据。先强化内容测试，再追加关卡 `l17`–`l20`；已有的校验器与 BFS 可达性搜索始终是配方歧义与可解性的权威依据。

**技术栈：** Vue 3、TypeScript、Pinia、Vitest、数据驱动的配方引擎与 BFS 可达性校验器。

## 全局约束

- 保留第 1–16 关与所有已有物品定义。
- 新章节为第 5 章，精确包含四关。
- 每关精确包含一种专业、一种临时、一种荒诞解法；三种都必须可达。
- 每关至少包含八条明确的、针对具体情境的失败配方，而非通用的复制粘贴式反馈。
- 不初始化 Git，也不安装依赖。

---

### 任务 1：先让 20 关、五章的契约失败

**文件：**
- 修改：`D:\games\7-RidiculousToolbox\src\data\content.spec.ts`
- 修改：`D:\games\7-RidiculousToolbox\src\puzzle\chapter_check.spec.ts`
- 测试：上述两个文件

**接口：**
- 输入：`LEVELS`、`reportContent()` 与 `levelsByChapter()`。
- 输出：数量、章节、档位、唯一性与失败反馈契约。

- [ ] **步骤 1：把总内容测试更新为 20**

从 `./levels` 导入 `LEVELS`，把套件文字改为 `20 关`，并改为：

```ts
expect(report.total).toBe(20);
```

新增：

```ts
it('第五章四关标题唯一、三档解法齐全且每关至少 8 条独特失败反馈', () => {
  const chapter5 = LEVELS.filter((level) => level.chapter === 5);
  expect(chapter5).toHaveLength(4);
  expect(new Set(chapter5.map((level) => level.title)).size).toBe(4);
  for (const level of chapter5) {
    expect(level.solutions.map((s) => s.tier).sort()).toEqual(['absurd', 'professional', 'temporary']);
    const failures = level.recipes.filter((recipe) => recipe.category === 'failure');
    expect(failures.length).toBeGreaterThanOrEqual(8);
    expect(new Set(failures.map((recipe) => recipe.feedback)).size).toBe(failures.length);
  }
});
```

- [ ] **步骤 2：更新章节分组预期**

把套件描述改为 `第一章到第五章，每章 4 关`，预期五个分组，并断言：

```ts
expect(groups.map((g) => g.chapter)).toEqual([1, 2, 3, 4, 5]);
```

- [ ] **步骤 3：运行两个测试并验证 RED**

```powershell
& 'C:\Users\Aeromantic\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\node_modules\vitest\vitest.mjs run src/data/content.spec.ts src/puzzle/chapter_check.spec.ts
```

预期：总数 16 对比 20、缺少第 5 章、第 5 章关卡为零等失败。

### 任务 2：扩展物品目录

**文件：**
- 修改：`D:\games\7-RidiculousToolbox\src\data\items.ts`
- 测试：`D:\games\7-RidiculousToolbox\src\data\content.spec.ts`

**接口：**
- 输入：`ItemDefinition` 与全局 `ITEM_DEFS` 查找。
- 输出：三个可复用物品定义与三个标签名。

- [ ] **步骤 1：新增三个精确定义**

```ts
oil: {
  id: 'oil', name: '润滑油', icon: '🛢️',
  tags: ['liquid', 'lubricant'],
  description: '少量能润滑机械结构，倒多了会留下难洗的油渍。',
},
remote: {
  id: 'remote', name: '投影遥控器', icon: '📺',
  tags: ['electronic', 'control'],
  description: '按钮很多，菜单键和方向键仍然清晰可见。',
},
mirror: {
  id: 'mirror', name: '小镜子', icon: '🪞',
  tags: ['glass', 'reflective'],
  description: '能改变光线方向，但不会修改投影设置。',
},
```

新增标签名：

```ts
control: '控制器',
lubricant: '润滑物',
reflective: '反光物',
```

- [ ] **步骤 2：运行定向内容测试**

预期：仍只有红色，因为缺少四关；一旦关卡开始使用这些 ID，不应再出现未知物品错误。

### 任务 3：新增关卡 17 与 18

**文件：**
- 修改：`D:\games\7-RidiculousToolbox\src\data\levels.ts`
- 测试：`D:\games\7-RidiculousToolbox\src\data\content.spec.ts`

**接口：**
- 输出：`Level` 记录 `l17` 与 `l18`，均为 `chapter: 5`。

- [ ] **步骤 1：新增 `l17` —— 吱呀作响的办公椅**

使用目标 `chair`，初始状态 `{ squeaking: true, fixed: false }`。背包中包含 `screwdriver`、`tape`、`cloth`、`soap`、`water`、`hammer`、`rope`、`magnet`、`matches`、`paper`、`cat`、`phone` 的实例。

新增一条组合配方，把精确物品 `cloth` + `tape` 组合成一个带状态 `{ taped: true }` 的布实例。新增解法配方：

- 专业：对 `chair` 使用 `screwdriver`；设置 `{ fixed: true, squeaking: false }`，档位 `professional`；反馈解释拧紧了松动的枢轴螺丝。
- 临时：使用带 `{ taped: true }` 的 `cloth`；设置 `{ fixed: true, squeaking: false }`，档位 `temporary`；反馈解释缠绕式防响包裹。
- 荒诞：使用精确物品 `soap`；设置 `{ fixed: true, squeaking: false }`，档位 `absurd`；反馈解释干肥皂充当了可疑润滑剂。

用精确物品 `water`、`hammer`、`rope`、`magnet`、`matches`、`paper`、`cat`、`phone` 新增八条失败。反馈分别解释生锈风险、框架弯曲、轮子被绑、磁力无关、火灾危险、纸张碎裂、受惊的猫，以及一个无法拧紧硬件的诊断 App。

新增三个要求目标已修复/不再吱呀且对应 `solvedTier` 标志的解法谓词。

- [ ] **步骤 2：新增 `l18` —— 卡死的行李箱拉链**

使用目标 `suitcase`，状态 `{ stuck: true, opened: false, stained: false }`。背包中包含 `oil`、`candle`、`coin`、`water`、`hammer`、`scissors`、`glue`、`rope`、`magnet`、`plant`、`icecream`、`screwdriver`。

解法：

- 专业：精确 `oil` 设置 `{ stuck: false, opened: true }`，档位 `professional`；描述在滑块上滴一滴受控的润滑油。
- 临时：精确 `candle` 设置相同终态，档位 `temporary`；描述沿拉链齿涂抹蜡。
- 荒诞：精确 `coin` 设置相同终态，档位 `absurd`；描述把硬币当作超大的替换拉片。

失败使用 `water`、`hammer`、`scissors`、`glue`、`rope`、`magnet`、`plant`、`icecream`。每条反馈必须点名新的损坏，或解释它为何无法松开滑块；胶水失败设置 `stuck: true`，冰淇淋设置 `stained: true` 却不解题。

- [ ] **步骤 3：运行定向测试**

预期：报告总数变为 18；校验器显示无配方歧义、无未知引用；两个新关卡均可经 BFS 到达。因关卡 19–20 缺失，总体计数/章节测试仍为红色。

### 任务 4：新增关卡 19 与 20

**文件：**
- 修改：`D:\games\7-RidiculousToolbox\src\data\levels.ts`
- 测试：`D:\games\7-RidiculousToolbox\src\data\content.spec.ts`

- [ ] **步骤 1：新增 `l19` —— 投影画面上下颠倒**

使用目标 `projector`，状态 `{ upsideDown: true, corrected: false, powered: true }`。背包中包含 `remote`、`phone`、`mirror`、`water`、`matches`、`hammer`、`tape`、`magnet`、`icecream`、`cloth`、`paper`。

解法：

- 专业：`remote` 打开方向菜单并设置 `{ upsideDown: false, corrected: true }`，档位 `professional`。
- 临时：`phone` 充当网络遥控器并设置相同状态，档位 `temporary`。
- 荒诞：`mirror` 不改变机器设置，但设置 `{ corrected: true, reflected: true }`，档位 `absurd`；其解法谓词要求 `corrected: true` 且 `reflected: true`。

失败使用 `water`、`matches`、`hammer`、`tape`、`magnet`、`icecream`、`cloth`、`paper`，各有独特解释，涵盖短路、过热、镜头损坏、通风堵塞、画面畸变、液体融化、镜头被遮、以及一张不会旋转像素的纸牌提示。

- [ ] **步骤 2：新增 `l20` —— 吞币不出货的自动售货机**

使用目标 `vending`，状态 `{ coinStuck: true, dispensed: false, refunded: false }`。背包中包含 `phone`、`magnet`、`hammer`、`water`、`matches`、`screwdriver`、`rope`、`glue`、`cat`、`balloon`、`icecream`。

解法：

- 专业：`phone` 联系客服并设置 `{ coinStuck: false, refunded: true }`，档位 `professional`。
- 临时：`magnet` 顶出退币口并设置 `{ coinStuck: false, refunded: true }`，档位 `temporary`。
- 荒诞：`hammer` 精准地敲一下并设置 `{ coinStuck: false, dispensed: true }`，档位 `absurd`。

失败使用 `water`、`matches`、`screwdriver`、`rope`、`glue`、`cat`、`balloon`、`icecream`，各有独特解释且无解题状态。不要让失败配方与某个解法共享完全相同的输入/目标/优先级签名。

- [ ] **步骤 3：运行定向测试并验证 GREEN**

预期：总共 20 关、章节编号 1–5、每章 4 关、零校验器错误、20 关全部可达，且第 5 章每关都具备三档解法加至少八条不同的失败消息。

### 任务 5：文档、完整验证与跨项目关卡

**文件：**
- 修改：`D:\games\7-RidiculousToolbox\README.md`

- [ ] **步骤 1：更新第 7 款游戏文档**

把 16 关改为 20 关、4 章改为 5 章，新增四个第 5 章标题，并把测试描述更新为反映 20 关可达性。保留对数据驱动配方、撤销/重做与三档解法的已有说明。

- [ ] **步骤 2：运行第 7 款游戏的全部检查**

```powershell
& 'C:\Users\Aeromantic\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\node_modules\vitest\vitest.mjs run
& 'C:\Users\Aeromantic\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\node_modules\vue-tsc\bin\vue-tsc.js --noEmit
& 'C:\Users\Aeromantic\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\node_modules\vite\bin\vite.js build
```

预期：所有测试通过，类型检查退出码 0，构建退出码 0。

- [ ] **步骤 3：运行跨项目测试与类型检查矩阵**

对目录 `1-AbsurdDecision` 到 `7-RidiculousToolbox` 逐一运行其本地 Vitest 套件与配置的类型检查（`vue-tsc --noEmit`，第 6 款使用 `tsc --noEmit`）。记录精确的测试计数与失败数。第 3、4 款必须保持不变，并继续分别通过 58 与 26 个测试。

- [ ] **步骤 4：运行全部七个生产构建**

用随附的 Node 可执行文件运行每个项目的本地 Vite 构建。预期：七个退出码均为 0。不要把输出复制进 `launcher`；打包与 launcher 刷新仍推迟。

- [ ] **步骤 5：人工内容冒烟测试**

逐一启动每个被改游戏的已有本地服务器并验证：第 1 款新事件可加载；第 2 款第 8 章显示四关；第 5 款案件选择显示第 8、9 章且完整调查可走到指认；第 6 款包选择显示值班考试及其规则预览；第 7 款第 5 章显示四关且每关都能走通三档。同时在每个被改游戏中打开一个既有内容项，确认旧导航仍可用。

- [ ] **步骤 6：条件性提交/检查点**

运行 `git -C D:\games rev-parse --is-inside-work-tree`。若如预期失败，跳过提交且不初始化 Git。若之后有了 Git，对第 7 款使用提交信息 `feat(ridiculous-toolbox): add verified fifth chapter`，其余计划各自单独提交。
