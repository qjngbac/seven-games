# GitHub 发布材料完整中文化设计

## 目标

将此前为 `qjngbac/seven-games` 生成的 GitHub 发布材料完整中文化，使仓库首页、
首版发行说明、发布操作指南、配置注释及内部设计/实施文档均以中文为主要语言，
同时保证所有命令、路径、标签和发布流程继续可执行。

## 中文化范围

需要中文化的文件：

- `.gitignore`：仅翻译注释，不修改任何忽略规则；
- `.gitattributes`：仅翻译注释，不修改任何属性规则；
- `README.md`：标题、介绍、表头、章节、操作说明、开发说明和许可证说明改为中文；
- `RELEASE_NOTES_v1.0.0.md`：首版发行说明全部改为中文；
- `docs/GITHUB_PUBLISH.md`：操作说明、检查说明、错误提示、展示标签和示例提交信息改为中文；
- `docs/superpowers/specs/2026-08-15-github-publication-design.md`：完整改写为中文；
- `docs/superpowers/plans/2026-08-15-github-publication-files.md`：完整改写为中文。

此次中文化还会把下列 GitHub 展示内容改为中文：

- 仓库 Description：`七款原创浏览器解谜小游戏合集，提供无需 Node.js 或 Python 的 Windows 离线便携版。`
- 首版 Release 标题：`七款小游戏 Windows 便携版 v1.0.0`
- Release 附件标签：`Windows 便携版`、`SHA-256 校验值`
- 首次提交示例：`发布七款小游戏 v1.0.0`
- 标签说明：`七款小游戏 Windows 便携版 v1.0.0`

## 必须保留原样的内容

以下内容不得翻译或改写：

- `LICENSE` 中的 GNU GPL v3 官方英文正文；
- `qjngbac/seven-games`、`v1.0.0`、`Games.zip`、`SHA256SUMS.txt`；
- 七个英文目录名及所有真实文件路径；
- Git、GitHub CLI、PowerShell、npm、Vite、Vue、Phaser、Node.js、Python 等技术标识；
- 命令名称、参数、正则表达式、代码变量和 URL；
- SHA-256 值；
- `Source code (zip)` 等 GitHub 页面上的实际英文按钮名称，在中文解释中保留为代码样式。

`LICENSE` 在修改前的 SHA-256 为
`E57F1C320B8CF8798A7D2FF83A6F9E06A33A03585F6E065FEA97F1D86DB84052`；
中文化完成后必须保持一致。

## 文档写法

公开文档使用简体中文，技术名词首次出现时不强制添加中文译名。命令块保持原命令，
只翻译字符串形式的用户提示、错误信息、提交说明、Release 展示标题和附件标签。
README 继续面向玩家和开发者两个受众，并明确玩家不需要安装 Node.js 或 Python。

内部设计和计划文档也使用中文，避免仓库中留下大段英文说明。文件名保持不变，
以免破坏现有链接。正式 GPL 许可证不提供非官方中文替代文本。

## 功能保持

中文化不得改变：

- Git 忽略范围；
- Git 属性和 `.cmd` 的 CRLF 约束；
- GitHub 仓库所有者、仓库名和公开可见性；
- `main` 分支、`v1.0.0` 标签及两个 Release 附件；
- 发布命令的参数和执行顺序；
- ZIP 内容、哈希、游戏代码、玩法、画面或打包结果。

## 验证

完成后执行以下验证：

1. 比较 `.gitignore` 和 `.gitattributes` 的非注释行，确认规则逐行不变；
2. 比较 `LICENSE` SHA-256，确认官方正文完全未改；
3. 检查公开文档中不再存在完整英文叙述段落；
4. 检查所有中文 Description、Release 标题、附件标签和示例提交信息存在；
5. 使用 PowerShell 解析器检查 README、Release Notes 和发布指南中的所有 PowerShell 代码块；
6. 检查 `gh repo create`、`gh release create`、`--verify-tag`、资产路径和标签未改变；
7. 重新核对 `SHA256SUMS.txt` 与 `Games.zip`；
8. 运行现有便携包静态验证，确认文档改动未触及游戏包；
9. 确认 `D:\games` 仍未初始化 Git，也没有执行任何远程上传。

## 边界

本次只修改此前生成的发布材料，不修改七款游戏源码、已有游戏文档、便携 ZIP、
打包服务、测试代码或依赖。不会执行 `git init`、提交、创建仓库、推送标签或创建 Release。
