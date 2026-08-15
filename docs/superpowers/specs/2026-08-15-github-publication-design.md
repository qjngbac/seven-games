# 七款小游戏 GitHub 发布设计

## 目标

将七款游戏的完整源码以 GPL-3.0 许可证发布到公开仓库
`qjngbac/seven-games`，同时通过 GitHub Release 分发经过测试的 Windows
便携包，避免把生成的二进制文件提交到 Git 历史。

## 仓库信息

- 所有者：`qjngbac`
- 仓库名：`seven-games`
- 可见性：公开
- 许可证：GNU 通用公共许可证第 3 版
- 默认分支：`main`
- GitHub Description：`七款原创浏览器解谜小游戏合集，提供无需 Node.js 或 Python 的 Windows 离线便携版。`

## 纳入版本控制的内容

首次源码提交包括：

- `1-AbsurdDecision` 至 `7-RidiculousToolbox`，但排除已安装依赖和生成文件；
- 每款游戏的源码、测试、包清单、锁文件、Vite 配置和项目文档；
- `launcher` 和 `packaging/windows-portable`；
- `docs` 和 `七款小游戏完整开发文档`；
- 本次生成的根目录发布材料。

以下内容不进入仓库：

- 任何 `node_modules` 目录；
- 任何 `dist` 目录；
- `release` 目录及 ZIP 附件；
- `.codex-audit` 和本地缓存目录；
- 根目录探测文件和复制报告；
- 游戏目录中已存在的测试、构建和诊断命令输出；
- 编辑器、操作系统、日志、覆盖率和临时文件。

将 Release 附件排除在 Git 历史之外，可以避免二进制文件重复累积。玩家从
GitHub Releases 获取便携包，开发者使用仓库中的源码和打包脚本重新生成。

## 需要生成的文件

- `.gitignore`：精确排除依赖、构建结果、Release 附件、审查目录和已知诊断输出，
  不使用会误伤真实游戏数据的 `*.json` 或 `*.txt` 宽泛规则；
- `.gitattributes`：规范文本换行，要求 `.cmd` 使用 CRLF，Shell 与源码文件使用
  LF，并把压缩包、办公文档和媒体文件视为二进制；
- `README.md`：介绍项目、七款游戏、Windows 玩家运行方式、开发命令、打包命令、
  仓库结构和许可证，并区分可运行的 Release 附件与 GitHub 自动生成的源码压缩包；
- `LICENSE`：未经修改的 GNU GPL 第 3 版官方正文；
- `RELEASE_NOTES_v1.0.0.md`：供 GitHub CLI 直接读取的首版发行说明；
- `release/SHA256SUMS.txt`：`Games.zip` 的校验文件，只作为附件上传；
- `docs/GITHUB_PUBLISH.md`：包含身份验证、初始化、检查、提交、建仓、标签、Release
  和远程核验的完整 PowerShell/GitHub CLI 命令。

## 首个版本

- 标签：`v1.0.0`
- 标题：`七款小游戏 Windows 便携版 v1.0.0`
- 附件：`release/Games.zip` 和 `release/SHA256SUMS.txt`
- 类型：稳定版、最新版本，不标记为预发布
- 玩家平台：Windows 10 和 Windows 11
- 玩家依赖：除 Windows 自带 PowerShell 和浏览器外，不需要其他运行环境

先在本地创建附注标签并推送，再创建 Release。`gh release create` 必须使用
`--verify-tag`，避免标签拼写错误时从错误提交静默创建 Release。发行说明从已提交的
Markdown 文件读取，两个被 Git 忽略的附件从本地直接上传。

## 发布流程

1. 验证生成的发布材料、忽略规则、便携 ZIP 和校验值。
2. 在 `D:\games` 初始化以 `main` 为首分支的 Git 仓库。
3. 暂存文件并完整检查待提交清单。
4. 创建 GPL-3.0 公开源码的首次提交。
5. 使用 `qjngbac` 登录 GitHub CLI 并核对当前账号。
6. 创建并推送公开仓库 `qjngbac/seven-games`，设置已确认的中文 Description。
7. 创建并推送附注标签 `v1.0.0`。
8. 使用 `Games.zip` 和 `SHA256SUMS.txt` 创建稳定的最新 Release。
9. 通过 GitHub CLI 读取仓库、可见性、标签、Release 和附件信息进行核对。

## 安全与验证

执行 `git add` 前，检查常见凭据文件名和密钥格式。首次提交前使用
`git status --short --ignored` 确认 `node_modules`、`dist` 和 `release` 均被
忽略，并拒绝任何包含这些目录名的暂存路径。

必须验证：

- 七个 `package.json` 均可提交；
- 依赖、构建结果、审查目录和 Release 附件均未暂存；
- `LICENSE` 可识别为 GPL-3.0；
- 校验文件与当前 `release/Games.zip` 的 SHA-256 一致；
- 便携包继续通过现有静态和运行验证；
- 远程仓库为公开的 `qjngbac/seven-games`，默认分支为 `main`；
- `v1.0.0` Release 恰好包含 `Games.zip` 和 `SHA256SUMS.txt`。

生成发布材料时不创建远程仓库、提交、标签或 Release。只有用户主动执行或明确授权
文档中的命令后，才进行 Git 历史或网络写入。
