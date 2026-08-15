# 荒诞情境判断游戏内容扩展实施计划

> **供自动化执行者使用：** 必须使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐项实施本计划。步骤使用复选框（`- [ ]`）跟踪。

**目标：** 为第 1 款游戏新增 16 个原创事件，使实际事件数从 34 增至 50，并新增四条两段式事件链。

**架构：** 将所有内容放入一个新的 JSON 事件包，并在现有加载器中注册。扩展内容测试以强制校验精确数量、新 ID、唯一标题，以及可解析的标签门控事件链；不要改动事件引擎或 Vue 组件。

**技术栈：** Vue 3、TypeScript、JSON 内容包、Vitest、Vite。

## 全局约束

- 逐字节保留已有的 34 个事件。
- 精确新增 8 个独立事件，外加 4 个事件链起点与 4 个事件链后续。
- 效果只能使用已有的资源键、关系、标签、延迟效果与条件。
- 每个事件至少有两个有意义的选项，且每个选项都有非空效果与解释性结果文本。
- 不初始化 Git，也不安装依赖。

---

### 任务 1：用失败测试锁定扩展契约

**文件：**
- 修改：`D:\games\1-AbsurdDecision\src\data\schema.spec.ts`
- 测试：`D:\games\1-AbsurdDecision\src\data\schema.spec.ts`

**接口：**
- 输入：来自 `src/data/index.ts` 的 `CONTENT`、`CONTENT_ERRORS`、`CONTENT_STATS`。
- 输出：针对总共 50 个事件、16 个精确新 ID、唯一标题，以及合法标签链来源的回归断言。

- [ ] **步骤 1：新增失败的内容计数与身份测试**

在已有内置内容测试之后添加此测试：

```ts
it('扩展后共 50 个事件，16 个新事件完整加载且标题不重复', () => {
  const newIds = [
    'calendar_midnight_001', 'desk_booking_001', 'translation_bot_001', 'shared_dock_001',
    'office_fridge_001', 'ai_resume_001', 'fire_drill_001', 'robot_vacuum_001',
    'ai_minutes_001', 'ai_minutes_inquiry_002',
    'smart_door_001', 'smart_door_twin_002',
    'cloud_bill_001', 'cloud_bill_review_002',
    'energy_bot_001', 'energy_bot_demo_002',
  ];
  expect(CONTENT_STATS.total).toBe(50);
  expect(CONTENT.events).toHaveLength(50);
  expect(new Set(CONTENT.events.map((e) => e.title)).size).toBe(50);
  expect(newIds.every((id) => CONTENT.events.some((e) => e.id === id))).toBe(true);
});
```

- [ ] **步骤 2：新增失败的链来源测试**

```ts
it('每个标签门控事件的 requiredTags 都能由其他事件产生', () => {
  const produced = new Set(
    CONTENT.events.flatMap((event) =>
      event.choices.flatMap((choice) =>
        [...choice.effects, ...(choice.delayed?.effects ?? [])]
          .filter((effect) => effect.type === 'tag' && effect.value === true)
          .map((effect) => effect.target),
      ),
    ),
  );
  for (const event of CONTENT.events) {
    for (const tag of event.conditions?.requiredTags ?? []) expect(produced.has(tag)).toBe(true);
  }
});
```

- [ ] **步骤 3：运行定向测试并验证 RED**

运行：

```powershell
& 'C:\Users\Aeromantic\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\node_modules\vitest\vitest.mjs run src/data/schema.spec.ts
```

预期：失败，因为 `CONTENT_STATS.total` 仍是 34，且 16 个 ID 都不存在。链来源断言对已有内容应保持绿色。

### 任务 2：新增八个独立事件

**文件：**
- 创建：`D:\games\1-AbsurdDecision\src\data\events\pack4.json`
- 修改：`D:\games\1-AbsurdDecision\src\data\index.ts`
- 测试：`D:\games\1-AbsurdDecision\src\data\schema.spec.ts`

**接口：**
- 输入：事件定义 JSON 模式，以及已有资源 `money`、`reputation`、`spirit`、`techDebt`；关系 `boss`、`client`、`team`、`ops`。
- 输出：八个独立 `EventDef` 对象，以及 `pack4` 的加载器注册。

- [ ] **步骤 1：先注册新包，再填充内容**

添加：

```ts
import pack4 from './events/pack4.json';
```

并改为：

```ts
const rawPacks = [pack1, pack2, pack3, pack4];
```

先将 `pack4.json` 创建为 `[]`，然后运行定向测试。预期：仍是 34 的红色状态。

- [ ] **步骤 2：新增八个独立事件记录**

使用以下精确的 ID、标题与决策结构。每个选项都必须包含具体的资源/关系/标签效果，以及解释取舍的结果文本。

| ID | 标题 | 三个决策方向 |
|---|---|---|
| `calendar_midnight_001` | 日历把截止时间排在 23:59 | 熬夜完成（声誉↑精神↓）；协商次日（精神↑老板关系↓）；自动提交半成品（技术债↑并延迟扣声誉） |
| `desk_booking_001` | 工位预约系统把你分到消防通道 | 找行政纠正（声誉↑时间成本以精神↓表示）；占会议室（团队关系↓精神↑）；在楼梯间办公（精神↓但解锁荒诞标签） |
| `translation_bot_001` | 翻译机器人把“稍后修复”译成“永不修复” | 立即澄清（客户关系↑精神↓）；怪罪模型（声誉↓）；将错就错承诺重做（声誉↑技术债↑） |
| `shared_dock_001` | 全公司只剩一个扩展坞 | 排队共享（团队关系↑精神↓）；自费购买（金钱↓精神↑）；拆会议室设备（声誉↓技术债↑） |
| `office_fridge_001` | 冰箱要求扫码签署开门协议 | 阅读后同意（精神↓）；拔网线离线开门（技术债↑）；向运维报安全问题（运维关系↑但午饭损失以精神↓表示） |
| `ai_resume_001` | 简历筛选器把全组判成不合格 | 人工复核（声誉↑精神↓）；调整阈值（技术债↑）；把结果发给老板看（老板关系↓但团队关系↑） |
| `fire_drill_001` | 线上事故撞上消防演习 | 按规定撤离（声誉↓精神↑）；抱电脑下楼处理（声誉↑精神↓）；交给值班同事（团队关系↓但精神↑） |
| `robot_vacuum_001` | 扫地机器人叼走了门禁卡 | 拆机取卡（运维关系↓声誉↑）；用零食诱导（精神↑金钱↓）；补办门禁（金钱↓并延迟扣声誉） |

- [ ] **步骤 3：运行定向测试**

预期：计数从 34 增至 42；测试仍为红色，因为缺少八条事件链记录。所有模式错误必须保持为空。

### 任务 3：新增四条两段式事件链

**文件：**
- 修改：`D:\games\1-AbsurdDecision\src\data\events\pack4.json`
- 测试：`D:\games\1-AbsurdDecision\src\data\schema.spec.ts`

**接口：**
- 输入：事件链起点产生的标签效果，以及其后续中的 `conditions.requiredTags`。
- 输出：四条可追踪的两段式事件链，以及四个新的必需标签。

- [ ] **步骤 1：新增 AI 会议纪要链**

使用起点 `ai_minutes_001`，标题 `AI 会议纪要把吐槽写进了行动项`。其风险选项“自动群发”产生 `ai_minutes_leaked=true`；其安全的复核选项消耗精神但提升声誉。新增后续 `ai_minutes_inquiry_002`，标题 `老板逐条询问那份 AI 纪要`，并设 `conditions.requiredTags: ['ai_minutes_leaked']`。后续选项为：承认并纠正、归咎于转录、或把那句尴尬的话变成真正的改进提案。

- [ ] **步骤 2：新增智能门禁链**

使用起点 `smart_door_001`，标题 `智能门禁只认微笑不认工牌`。启用仅面容通行会产生 `face_only_access=true`；门禁卡兜底方案以金钱/精力为代价提升安全性。新增 `smart_door_twin_002`，标题 `门禁把老板的双胞胎也放进来了`，由 `face_only_access` 门控。后续选项为：关闭仅面容通行、悄悄把访客带离、或声称这是一次 A/B 测试。

- [ ] **步骤 3：新增云账单链**

使用起点 `cloud_bill_001`，标题 `云账单一夜长出六个零`。拖到月底再处理会产生 `cloud_bill_deferred=true`；调查可降低技术债但消耗精神；无差别关停则有损声誉。新增 `cloud_bill_review_002`，标题 `财务带着那六个零来复盘`，由 `cloud_bill_deferred` 门控。后续选项为：出具成本报告、把测试集群藏到另一个预算下、或协商分期还款。

- [ ] **步骤 4：新增节能机器人链**

使用起点 `energy_bot_001`，标题 `节能机器人开始替大家关电脑`。允许自动关机产生 `auto_power_policy=true`；白名单与手动模式有不同的老板/团队/技术债取舍。新增 `energy_bot_demo_002`，标题 `客户演示时节能机器人准点断电`，由 `auto_power_policy` 门控。后续选项为：紧急覆盖、在白板上继续演示、或把这次断电夸成一项可持续特性。

- [ ] **步骤 5：运行定向测试并验证 GREEN**

预期：所有模式测试通过，总计等于 50，16 个 ID 全部加载，50 个标题均唯一，且每个必需标签都有生产者。

### 任务 4：更新文档并验证第 1 款游戏

**文件：**
- 修改：`D:\games\1-AbsurdDecision\README.md`
- 验证：`D:\games\1-AbsurdDecision\src\data\events\pack4.json`

- [ ] **步骤 1：修正 README 中的内容计数**

把过时的“24 个事件、4 条事件链”表述改为“50 个事件、9 个带标签门控的后续事件，其中新增 16 个事件与 4 条两段式事件链”。如果列出了事件包名称，把 `pack4.json` 也加进目录说明。

- [ ] **步骤 2：运行第 1 款游戏的全部检查**

```powershell
& 'C:\Users\Aeromantic\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\node_modules\vitest\vitest.mjs run
& 'C:\Users\Aeromantic\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\node_modules\vue-tsc\bin\vue-tsc.js --noEmit
& 'C:\Users\Aeromantic\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\node_modules\vite\bin\vite.js build
```

预期：0 个失败测试，类型检查退出码 0，构建退出码 0。

- [ ] **步骤 3：条件性提交/检查点**

运行 `git -C D:\games rev-parse --is-inside-work-tree`。预期结果：不是仓库。跳过提交，不初始化 Git，并在交接记录中记下被改动的文件。如果用户之后创建了仓库，使用提交信息 `feat(absurd-decision): add sixteen verified events`。
