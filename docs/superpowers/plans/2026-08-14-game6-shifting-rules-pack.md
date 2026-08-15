# 规则变化反应判断游戏值班考核规则包实施计划

> **供自动化执行者使用：** 必须使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐项实施本计划。步骤使用复选框（`- [ ]`）跟踪。

**目标：** 新增第六个规则包，完全基于已有的刺激字段与动作创造新的优先级交互。

**架构：** 定义一个 JSON `RawRuleSet`，在 `packs.ts` 中注册，并依赖已有的编译器/求值器外加 20000 刺激校验器。无需改动 Phaser 场景、输入、渲染器或模式。

**技术栈：** Phaser 3、TypeScript、JSON 规则包、Vitest、Vite。

## 全局约束

- 仅使用已有字段 `color`、`word`、`number`、`character` 与动作 `LEFT`、`RIGHT`、`SKIP`、`INVERT_BASE`。
- 难度来自规则优先级与复合谓词，而非更短的计时器。
- 已有的五个规则包保持不变。
- 不初始化 Git，也不安装依赖。

---

### 任务 1：先让六包契约失败

**文件：**
- 修改：`D:\games\6-ShiftingRules\src\game\stimuli\validator.spec.ts`
- 测试：`D:\games\6-ShiftingRules\src\game\stimuli\validator.spec.ts`

**接口：**
- 输入：`PACKS`、`LOAD_ERRORS`、`validateRuleSet`。
- 输出：`pack-duty-exam` 的精确数量与身份契约。

- [ ] **步骤 1：更新包加载断言**

把：

```ts
expect(PACKS.length).toBe(5);
```

改为：

```ts
expect(PACKS.length).toBe(6);
expect(PACKS.map((p) => p.id)).toContain('pack-duty-exam');
```

- [ ] **步骤 2：运行定向测试并验证 RED**

```powershell
& 'C:\Users\Aeromantic\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\node_modules\vitest\vitest.mjs run src/game/stimuli/validator.spec.ts
```

预期：包数量与 ID 断言失败，因为只加载了五个包。

### 任务 2：新增并注册完整的值班规则包

**文件：**
- 创建：`D:\games\6-ShiftingRules\src\data\rule-packs\pack-duty-exam.json`
- 修改：`D:\games\6-ShiftingRules\src\data\packs.ts`
- 测试：`D:\games\6-ShiftingRules\src\game\stimuli\validator.spec.ts`

**接口：**
- 输入：`RawRuleSet` 简写谓词与编译器优先级语义。
- 输出：编译后规则集 ID `pack-duty-exam`，含 11 条可达规则。

- [ ] **步骤 1：创建精确的 JSON 规则包**

```json
{
  "id": "pack-duty-exam",
  "name": "综合值班考试",
  "difficulty": 5,
  "conflictPolicy": "block",
  "initialActive": 3,
  "revealEvery": 6,
  "rules": [
    { "id": "duty_red_left", "predicate": { "color": "red" }, "action": "LEFT", "priority": 10, "text": "红色按左", "example": "红 → 左" },
    { "id": "duty_blue_right", "predicate": { "color": "blue" }, "action": "RIGHT", "priority": 10, "text": "蓝色按右", "example": "蓝 → 右" },
    { "id": "duty_green_skip", "predicate": { "color": "green" }, "action": "SKIP", "priority": 10, "text": "绿色跳过", "example": "绿 → 跳过" },
    { "id": "duty_even_right", "predicate": { "numberIsEven": true }, "action": "RIGHT", "priority": 20, "text": "偶数按右", "example": "红色 4 → 右" },
    { "id": "duty_odd_left", "predicate": { "numberIsOdd": true }, "action": "LEFT", "priority": 20, "text": "奇数按左", "example": "蓝色 3 → 左" },
    { "id": "duty_robot_left", "predicate": { "character": "robot" }, "action": "LEFT", "priority": 30, "text": "机器人按左", "example": "机器人 → 左" },
    { "id": "duty_alien_skip", "predicate": { "character": "alien" }, "action": "SKIP", "priority": 35, "text": "外星人跳过", "example": "外星人 → 跳过" },
    { "id": "duty_word_red_right", "predicate": { "word": "红" }, "action": "RIGHT", "priority": 60, "text": "文字写「红」按右", "example": "蓝底红字 → 右" },
    { "id": "duty_word_blue_left", "predicate": { "word": "蓝" }, "action": "LEFT", "priority": 60, "text": "文字写「蓝」按左", "example": "红底蓝字 → 左" },
    { "id": "duty_even_robot_skip", "predicate": { "all": [{ "character": "robot" }, { "numberIsEven": true }] }, "action": "SKIP", "priority": 80, "text": "偶数机器人跳过", "example": "机器人 4 → 跳过" },
    { "id": "duty_ghost_invert", "predicate": { "character": "ghost" }, "action": "INVERT_BASE", "priority": 100, "text": "幽灵让最终左右反转", "example": "红色幽灵 → 右" }
  ]
}
```

- [ ] **步骤 2：注册该包**

添加：

```ts
import packDutyExam from './rule-packs/pack-duty-exam.json';
```

并改为：

```ts
const SOURCES: RawRuleSet[] = [
  packBase, packParity, packCharacter, packText, packExtreme, packDutyExam,
] as RawRuleSet[];
```

- [ ] **步骤 3：运行定向校验器并验证 GREEN**

预期：六个包加载成功，`LOAD_ERRORS` 为空，且新包的 20000 刺激报告无冲突、无不可达规则。

- [ ] **步骤 4：仅在校验器暴露歧义时才新增求值器示例**

不要预先改动求值器生产代码。若出现意外结果，在修复前先为这些确切情况新增一个定向求值器测试：

```ts
// 红 + 奇数 + 文字「蓝」 -> 文字规则胜出 -> LEFT
// 机器人 + 偶数 -> 复合优先级 80 胜出 -> SKIP
// 红 + 幽灵 -> 基础 LEFT 然后反转 -> RIGHT
```

改动数据前先调查规则追踪；每次只改一个谓词/优先级。

### 任务 3：文档与完整验证

**文件：**
- 修改：`D:\games\6-ShiftingRules\README.md`

- [ ] **步骤 1：更新文档**

把“5 个规则包”改为“6 个规则包”，在内容章节中加入“综合值班考试”，并描述其新交互：反转的文字规则、偶数机器人的覆盖、以及幽灵的最终反转。不要声称有新的输入模式或计时器改动。

- [ ] **步骤 2：运行第 6 款游戏的全部检查**

```powershell
& 'C:\Users\Aeromantic\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\node_modules\vitest\vitest.mjs run
& 'C:\Users\Aeromantic\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\node_modules\typescript\bin\tsc --noEmit
& 'C:\Users\Aeromantic\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\node_modules\vite\bin\vite.js build
```

预期：所有测试通过，类型检查退出码 0，构建退出码 0。

- [ ] **步骤 3：条件性提交/检查点**

运行 `git -C D:\games rev-parse --is-inside-work-tree`。若如预期失败，跳过提交且不初始化 Git。若之后有了 Git，使用 `feat(shifting-rules): add comprehensive duty exam pack`。
