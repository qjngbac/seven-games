# GitHub 发布材料完整中文化实施计划

> **供自动化执行者使用：** 必须使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐项实施本计划。步骤使用复选框（`- [ ]`）跟踪。

**目标：** 将此前生成的 GitHub 发布材料完整中文化，同时保持许可证、Git 规则、命令、路径、标签和便携包功能不变。

**架构：** 把配置文件视为“规则加注释”，只替换注释；把公开文档视为“中文说明加不可变代码块”，重写说明但保留命令契约；把内部设计/计划整体改写为中文。完成后分别验证规则、许可证哈希、文档语言、PowerShell 语法和便携包。

**技术栈：** Markdown、Git 属性/忽略规则、PowerShell、GitHub CLI、GPL-3.0。

## 全局约束

- 不修改 `LICENSE`，其 SHA-256 必须保持 `E57F1C320B8CF8798A7D2FF83A6F9E06A33A03585F6E065FEA97F1D86DB84052`。
- 不修改 `.gitignore` 和 `.gitattributes` 的任何非注释规则。
- 保留 `qjngbac/seven-games`、`main`、`v1.0.0`、`Games.zip` 和 `SHA256SUMS.txt`。
- 保留全部命令、参数、路径、URL、正则表达式和技术名称。
- 仓库 Description 改为：`七款原创浏览器解谜小游戏合集，提供无需 Node.js 或 Python 的 Windows 离线便携版。`
- Release 标题改为：`七款小游戏 Windows 便携版 v1.0.0`。
- 不修改游戏源码、玩法、画面、ZIP、服务器或依赖。
- 不执行 `git init`、提交、远程仓库创建、推送或 Release 发布。

---

### 任务 1：配置注释中文化

**文件：**
- 修改：`.gitignore`
- 修改：`.gitattributes`

**接口：**
- 输入：当前规则行和英文注释。
- 输出：规则逐行不变、注释全部中文的两个配置文件。

- [ ] **步骤 1：保存规则快照**

读取两个文件，去除空行和以 `#` 开头的注释行，保存规则行数组及 SHA-256。

- [ ] **步骤 2：翻译注释**

逐项把依赖、构建、发布、审查、环境、编辑器、探测输出、Windows 脚本、源码文档和二进制文件等注释改为简体中文，不编辑规则行。

- [ ] **步骤 3：比较规则**

再次提取非注释行并逐行比较。预期：两份规则数组与快照完全相同。

---

### 任务 2：公开文档中文化

**文件：**
- 修改：`README.md`
- 修改：`RELEASE_NOTES_v1.0.0.md`
- 修改：`docs/GITHUB_PUBLISH.md`

**接口：**
- 输入：当前玩家说明、开发说明、发布流程和命令块。
- 输出：中文仓库首页、中文首版发行说明和中文命令行发布指南。

- [ ] **步骤 1：重写 README**

将标题、简介、表格列名、下载、运行、校验、开发、目录和许可证章节改为中文。保留七个目录名、下载链接、PowerShell 命令、技术名称和 GPL 标识。

- [ ] **步骤 2：重写 Release Notes**

将首版说明、游戏清单、系统要求、运行步骤、完整性校验和许可证说明改为中文。Release 标题使用 `七款小游戏 Windows 便携版 v1.0.0`，哈希保持不变。

- [ ] **步骤 3：重写 GitHub 发布指南**

将全部操作解释、验证说明、错误字符串、Description、Release 标题、附件标签和提交示例改为中文。保留 `gh repo create`、`gh release create`、`--verify-tag`、资产路径及所有执行顺序。

- [ ] **步骤 4：解析命令块**

提取三份文档中所有 `powershell` 代码块，通过 PowerShell 解析器检查。预期：零语法错误。

---

### 任务 3：内部文档中文化

**文件：**
- 修改：`docs/superpowers/specs/2026-08-15-github-publication-design.md`
- 修改：`docs/superpowers/plans/2026-08-15-github-publication-files.md`

**接口：**
- 输入：英文发布设计和英文文件生成计划。
- 输出：不改变决策、路径和验证契约的中文版本。

- [ ] **步骤 1：改写发布设计**

将目标、仓库身份、跟踪范围、生成文件、首版发布、流程、安全验证和边界全部改为中文。

- [ ] **步骤 2：改写文件生成计划**

将计划标题、目标、架构、约束、任务、接口、步骤和预期结果全部改为中文；保留命令块及路径。

- [ ] **步骤 3：检查英文叙述残留**

逐行检查七个目标文件。允许代码块、反引号内容、URL、目录/文件名、命令参数及技术名词；不允许完整英文叙述句或英文配置注释残留。

---

### 任务 4：完整验证

**文件：**
- 测试：全部中文化目标文件
- 测试：`release/Games.zip`
- 测试：`release/SHA256SUMS.txt`
- 测试：`packaging/windows-portable/verify-release.ps1`

**接口：**
- 输入：中文化后的发布材料和未修改的便携包。
- 输出：中文化完整且功能契约不变的验证证据。

- [ ] **步骤 1：验证固定标识**

要求七个目标文件包含各自需要的仓库名、标签、附件名、GPL 标识、Windows 版本和运行时说明；发布指南必须包含中文 Description 与中文 Release 标题。

- [ ] **步骤 2：验证许可证和 ZIP 哈希**

比较 `LICENSE` SHA-256；解析 `SHA256SUMS.txt` 并重新计算 `Games.zip`。预期：两项均与中文化前一致。

- [ ] **步骤 3：验证命令契约**

检查 `gh repo create qjngbac/seven-games`、`--public`、`--source=.`、`--remote=origin`、`--push`、`git tag -a v1.0.0`、`gh release create v1.0.0`、`--verify-tag` 和两个附件路径仍存在。

- [ ] **步骤 4：验证便携包**

运行：

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\packaging\windows-portable\verify-release.ps1 -ZipPath .\release\Games.zip
```

预期：`RELEASE_VERIFY_OK`、退出码 0，并确认端口 5200 未被遗留占用。

- [ ] **步骤 5：验证无外部状态变化**

确认 `D:\games\.git` 不存在，没有调用任何 GitHub 写命令，临时审查目录无残留。
