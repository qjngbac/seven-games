# 七款小游戏 GitHub 发布文件实施计划

> **供自动化执行者使用：** 必须使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐项执行本计划。步骤使用复选框（`- [ ]`）跟踪。

**目标：** 准备用于把 `D:\games` 发布为 `qjngbac/seven-games` 并创建
`v1.0.0` Windows Release 所需的本地说明、许可证、发行说明、校验值和命令指南。

**架构：** 将原创源码和可复现打包脚本纳入 Git，排除已安装依赖和生成结果；
Windows ZIP 及校验文件保留在被忽略的 `release` 目录中，通过 GitHub CLI 直接作为
Release 附件上传。

**技术栈：** Git、GitHub CLI（`gh`）、PowerShell、Markdown、GPL-3.0。

## 全局约束

- 仓库必须为 `qjngbac/seven-games`。
- 仓库公开，默认分支为 `main`。
- 许可证为 GNU 通用公共许可证第 3 版。
- 首个标签为 `v1.0.0`，Release 为稳定的最新版本。
- `release/Games.zip` 和 `release/SHA256SUMS.txt` 仅作为 Release 附件，不进入 Git。
- `node_modules`、`dist`、`.codex-audit` 和诊断输出不得进入 Git 历史。
- 生成文件时不初始化 Git、不创建提交、不创建远程仓库、不推送、不打标签，也不发布 Release。
- 不下载依赖或添加大型文件。

---

### 任务 1：版本控制边界与许可证

**文件：**
- 创建：`.gitignore`
- 创建：`.gitattributes`
- 创建：`LICENSE`

**接口：**
- 输入：当前七个项目和已确认的 GPL-3.0 授权选择。
- 输出：确定的 Git 纳入规则、跨平台换行规则和仓库许可证。

- [ ] **步骤 1：创建 `.gitignore`**

使用根目录及递归规则排除依赖、构建、Release、审查、覆盖率、缓存、日志、编辑器、
根目录探测文件和已知诊断输出。不得使用 `*.json` 或 `*.txt` 等宽泛规则，因为游戏中
包含真实数据和文档。

- [ ] **步骤 2：创建 `.gitattributes`**

使用 `* text=auto`；`.cmd` 和 `.bat` 使用 CRLF；源码、配置和 Shell 文件使用 LF；
ZIP、办公文档、图片、音频、视频和字体使用 `binary`。

- [ ] **步骤 3：添加官方 GPL-3.0 正文**

从 `https://www.gnu.org/licenses/gpl-3.0.txt` 获取官方小型文本并保存为 `LICENSE`。
验证开头为 `GNU GENERAL PUBLIC LICENSE`，版本为 `Version 3, 29 June 2007`，并包含
标准使用说明。

- [ ] **步骤 4：验证边界**

使用 PowerShell 检查 `.gitignore`、`.gitattributes` 和 `LICENSE`。预期：必需规则
全部存在，不包含宽泛 JSON/TXT 排除规则，许可证可识别为 GPL 第 3 版。

---

### 任务 2：项目与发行文档

**文件：**
- 创建：`README.md`
- 创建：`RELEASE_NOTES_v1.0.0.md`
- 创建：`docs/GITHUB_PUBLISH.md`

**接口：**
- 输入：七款游戏的包名和脚本、Windows 便携包行为、`qjngbac/seven-games` 和
  `v1.0.0` 发布契约。
- 输出：公开仓库首页、准确的 Release 正文及可重复执行的命令行发布流程。

- [ ] **步骤 1：创建 `README.md`**

说明七款游戏、Windows 支持范围、玩家启动方式、开发依赖、逐游戏构建命令、
便携包打包与验证、仓库结构、存档方式和 GPL-3.0。明确玩家不需要 Node.js 或 Python。

- [ ] **步骤 2：创建 `RELEASE_NOTES_v1.0.0.md`**

说明首个稳定版本、七款游戏、Windows 10/11、解压与启动方式、无需额外运行环境、
浏览器本地存档及校验方式。提醒玩家下载 `Games.zip`，不要下载 GitHub 自动生成的
源码压缩包。

- [ ] **步骤 3：创建 `docs/GITHUB_PUBLISH.md`**

提供以下 PowerShell 命令：

1. 检查 `git`、`gh` 及当前 GitHub 账号；
2. 检查凭据文件名和常见密钥格式；
3. 初始化 `main`；
4. 暂存文件，并在提交前拒绝禁止路径；
5. 创建首次提交；
6. 使用 `gh repo create --public --source=. --remote=origin --push` 和中文 Description
   创建 `qjngbac/seven-games`；
7. 创建并推送附注标签 `v1.0.0`；
8. 使用 `--verify-tag`、`--notes-file` 和两个附件创建 Release；
9. 使用 `gh` 读取仓库和 Release 信息。

同时提供后续源码更新和后续版本发布命令，不重复初始化仓库。

- [ ] **步骤 4：验证文档一致性**

检查三份文档中的所有者/仓库、标签、附件名、许可证、平台和运行时声明。不得包含
占位符、桌面版操作或相互矛盾的包名。

---

### 任务 3：Release 校验值与端到端验证

**文件：**
- 创建：`release/SHA256SUMS.txt`
- 测试：`packaging/windows-portable/verify-release.ps1`
- 测试：`packaging/windows-portable/verify-zip-runtime.ps1`

**接口：**
- 输入：当前 `release/Games.zip` 和已有便携包验证器。
- 输出：与待上传 ZIP 完全一致的校验附件，以及发布材料没有指向损坏包的最新证据。

- [ ] **步骤 1：生成 `release/SHA256SUMS.txt`**

使用 `Get-FileHash` 计算 SHA-256，以 ASCII 写入唯一一行，格式为
`<64 位大写十六进制值> *Games.zip`。

- [ ] **步骤 2：验证校验值**

解析校验文件并重新计算 `release/Games.zip`。预期：仅一行、仅一个附件，哈希和文件名
完全一致。

- [ ] **步骤 3：运行便携包静态验证**

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\packaging\windows-portable\verify-release.ps1 -ZipPath .\release\Games.zip
```

预期：输出 `RELEASE_VERIFY_OK`，退出码为 0。

- [ ] **步骤 4：运行 ZIP 解压与运行验证**

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\packaging\windows-portable\verify-zip-runtime.ps1 -ZipPath .\release\Games.zip
```

预期：输出 `ZIP_RUNTIME_VERIFY_OK`，七个游戏和引用资源均可访问，清理后 5200 端口空闲。

- [ ] **步骤 5：在不初始化正式工作区的前提下审查首次提交候选**

`git check-ignore` 即使使用 `--no-index` 也需要仓库元数据。因此在 `.codex-audit`
下创建唯一的一次性测试仓库，复制 `.gitignore`，验证依赖、构建、Release、审查和
探测路径会被忽略，然后精确删除该测试目录。不得初始化 `D:\games`。

独立枚举未被忽略的工作区文件，要求七个 `package.json`、发布材料、打包脚本和文档
仍可提交。报告生成文件与发布命令，但不进行项目 Git 历史或网络写入。
