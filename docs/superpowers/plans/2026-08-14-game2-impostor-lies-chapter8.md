# 伪装者逻辑推理游戏第 8 章恢复实施计划

> **供自动化执行者使用：** 必须使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐项实施本计划。步骤使用复选框（`- [ ]`）跟踪。

**目标：** 用四个生成的、唯一解法的谜题替换已确认为空的第 8 章数据文件，且不修改第 1–7 章。

**架构：** 在隔离的审计目录中使用现有的确定性生成器与求解器，在那里校验全部 32 个生成谜题，然后把生成的 `ch8.json` 复制进游戏。已有的失败内容测试即作为回归测试。

**技术栈：** Vue 3、TypeScript、Vitest、确定性谜题生成器、AST 求值器与求解器。

## 全局约束

- 逐字节保留 `ch1.json` 到 `ch7.json`。
- 不得降低 `CHAPTERS.length * 4`，也不得从仓库中移除第 8 章。
- 不得手工编写绕过 `solve()` 或 `validatePuzzle()` 的谜题。
- 临时生成输出必须留在 `D:\games\.codex-audit` 下，并在安装好已校验的 `ch8.json` 后删除。
- 不初始化 Git，也不安装依赖。

---

### 任务 1：再次确认失败的第 8 章契约

**文件：**
- 测试：`D:\games\2-ImpostorLies\src\data\content.spec.ts`
- 检查：`D:\games\2-ImpostorLies\src\data\puzzles\ch8.json`

**接口：**
- 输入：`CHAPTERS`、`CONTENT_STATS`、`CONTENT` 与 `solve()`。
- 输出：已有的红色证据：总共 28 个谜题，且 `ch8` 中零个谜题 ID。

- [ ] **步骤 1：核实源头症状**

确认 `ch8.json` 恰好包含 `[]`，且仓库仍在导入它。

- [ ] **步骤 2：运行已有定向测试并验证 RED**

```powershell
& 'C:\Users\Aeromantic\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\node_modules\vitest\vitest.mjs run src/data/content.spec.ts
```

预期：两个失败——`expected 28 to be 32` 与 `ch8 应有 4 关`。

### 任务 2：生成第 8 章，不动旧章节

**文件：**
- 临时生成：`D:\games\.codex-audit\impostor-gen\src\data\puzzles\ch1.json` 至 `ch8.json`
- 用生成结果修改：`D:\games\2-ImpostorLies\src\data\puzzles\ch8.json`
- 源工具：`D:\games\2-ImpostorLies\src\dev\generator.ts`

**接口：**
- 输入：`CHAPTER_SPECS`、`generateAllPuzzles(rootDir)`，以及从 `20260814` 开始的确定性随机种子序列。
- 输出：四个谜题 `ch8_01` 到 `ch8_04`，每个求解状态均为 `unique`。

- [ ] **步骤 1：创建隔离的生成根目录**

仅创建 `D:\games\.codex-audit\impostor-gen`，不要复制 `node_modules`。

- [ ] **步骤 2：以审计目录作为进程工作目录运行官方生成器**

在 `D:\games\.codex-audit\impostor-gen` 下运行：

```powershell
$env:GEN='1'
& 'C:\Users\Aeromantic\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'D:\games\2-ImpostorLies\node_modules\vitest\vitest.mjs' run 'D:\games\2-ImpostorLies\src\dev\generate.spec.ts' --root 'D:\games\2-ImpostorLies'
```

预期输出：`total: 32`，每章数量 `4`，测试退出码 0。`failed` 诊断数组中个别搜索未命中是可以接受的，只要最终总数仍为 32、且第 8 章仍为 4。

- [ ] **步骤 3：校验隔离出来的章节**

检查生成的 `ch8.json` 含四条记录，ID 精确为 `ch8_01`、`ch8_02`、`ch8_03`、`ch8_04`；标题不重复；每条记录使用第 8 章角色 `captain`、`pilot`、`engineer`、`impostor`；且每条都包含四个角色与四条陈述。

- [ ] **步骤 4：仅安装第 8 章**

把生成的审计 `ch8.json` 覆盖到原始的空文件 `D:\games\2-ImpostorLies\src\data\puzzles\ch8.json`。不要复制生成的 `ch1.json`–`ch7.json`。

- [ ] **步骤 5：运行定向内容测试并验证 GREEN**

预期：4/4 内容测试通过；报告显示总共 32、保留 32、零错误，且每章数量均为 4。

### 任务 3：编辑审查、清理与完整验证

**文件：**
- 审查：`D:\games\2-ImpostorLies\src\data\puzzles\ch8.json`
- 删除临时文件：`D:\games\.codex-audit\impostor-gen\src\data\puzzles\*.json`

- [ ] **步骤 1：在不改变逻辑语义的前提下审查面向玩家的内容**

阅读四个标题、场景、角色名、简介、陈述文本、角色标签与机制文本。只修正明显的措辞或编码缺陷。若某条陈述文本有改动，把它映射回其 `expr` 并立即重跑求解器测试；绝不为了风格而改变某条陈述，否则 AST 含义会漂移。

- [ ] **步骤 2：任何编辑改动后重跑定向测试**

预期：四个谜题仍为 `unique`，`illformed=false`，内容错误为空。

- [ ] **步骤 3：删除审计输出**

在删除前，解析并列出 `D:\games\.codex-audit\impostor-gen` 下的确切文件。只删除这个生成的审计目录；不要在其外使用宽泛通配符。

- [ ] **步骤 4：运行第 2 款游戏的全部检查**

```powershell
& 'C:\Users\Aeromantic\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\node_modules\vitest\vitest.mjs run
& 'C:\Users\Aeromantic\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\node_modules\vue-tsc\bin\vue-tsc.js --noEmit
& 'C:\Users\Aeromantic\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\node_modules\vite\bin\vite.js build
```

预期：32/32 测试通过，类型检查退出码 0，构建退出码 0。

- [ ] **步骤 5：条件性提交/检查点**

运行 `git -C D:\games rev-parse --is-inside-work-tree`。若如预期失败，跳过提交且不初始化 Git。若之后有了 Git，使用提交信息 `fix(impostor-lies): restore four chapter eight puzzles`。
