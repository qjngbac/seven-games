# 七款小游戏 Windows 便携包实施计划

> **供自动化执行者使用：** 必须使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐项实施本计划。步骤使用复选框（`- [ ]`）跟踪。

**目标：** 构建一个 Windows 10/11 便携文件夹与 ZIP，从一个离线大厅启动最新的七款游戏，且接收方电脑上无需 Node.js 或 Python。

**架构：** 把所有游戏代码作为预构建的静态 Vite 输出保留。一个小型 PowerShell 5.1 TcpListener 仅在 127.0.0.1:5200 上提供包目录服务，一个 CMD 文件负责启动它。一个可复现的 PowerShell 构建脚本把七个当前 dist 目录复制进干净的发布树并创建 ZIP。

**技术栈：** Windows PowerShell 5.1、.NET TcpListener、CMD、静态 HTML、Vite dist 资源、Compress-Archive。

## 全局约束

- 仅支持 Windows 10 与 Windows 11。
- 接收方不得需要 Node.js、Python、npm、node_modules 或互联网访问。
- 不下载 Electron、Node 运行时或任何其他大型依赖。
- 不修改七款游戏的玩法、画面、源码架构或工具链。
- 把打包后的服务器仅绑定到 127.0.0.1:5200。
- 固定使用 5200 端口，以便浏览器 localStorage 保持在同一个源下。
- 同时交付 `release/Seven-Games-Windows-Portable/` 与 `release/Seven-Games-Windows-Portable-2026-08-14.zip`。
- 不初始化 Git；本工作区不是 Git 仓库。

## 文件映射

- 创建 `packaging/windows-portable/template/server.ps1`：无依赖的回环 HTTP 服务器。
- 创建 `packaging/windows-portable/template/开始游戏.cmd`：双击即用的 Windows 入口。
- 创建 `packaging/windows-portable/template/index.html`：七张卡片的离线大厅。
- 创建 `packaging/windows-portable/template/README.txt`：接收方说明与排障指南。
- 创建 `packaging/windows-portable/build.ps1`：校验输入、构建干净发布树、复制七个 dist 输出并创建 ZIP。
- 创建 `packaging/windows-portable/verify-release.ps1`：静态发布/ZIP 契约检查。
- 生成 `release/Seven-Games-Windows-Portable/`：最终解包后的包。
- 生成 `release/Seven-Games-Windows-Portable-2026-08-14.zip`：可发送的归档。

---

### 任务 1：发布契约测试

**文件：**
- 创建：`packaging/windows-portable/verify-release.ps1`
- 测试目标：`release/Seven-Games-Windows-Portable/`

**接口：**
- 输入：可选的 `-ReleaseRoot` 与 `-ZipPath` 参数。
- 输出：当每条包不变量都成立时退出码 0 并打印 `RELEASE_VERIFY_OK`；否则抛出失败的不变量。

- [ ] **步骤 1：编写会失败的发布校验器**

校验器必须：

~~~powershell
param(
  [string]$ReleaseRoot = (Join-Path $PSScriptRoot '..\..\release\Seven-Games-Windows-Portable'),
  [string]$ZipPath = (Join-Path $PSScriptRoot '..\..\release\Seven-Games-Windows-Portable-2026-08-14.zip')
)
$ErrorActionPreference = 'Stop'
$expectedGames = @(
  'absurd-decision', 'impostor-lies', 'no-server-boom',
  'absurd-censor', 'who-broke-prod', 'shifting-rules',
  'ridiculous-toolbox'
)
foreach ($required in @('开始游戏.cmd','server.ps1','README.txt','index.html')) {
  if (-not (Test-Path -LiteralPath (Join-Path $ReleaseRoot $required) -PathType Leaf)) {
    throw "Missing required file: $required"
  }
}
foreach ($game in $expectedGames) {
  $index = Join-Path $ReleaseRoot "games\$game\index.html"
  if (-not (Test-Path -LiteralPath $index -PathType Leaf)) {
    throw "Missing game index: $game"
  }
}
$forbidden = Get-ChildItem -LiteralPath $ReleaseRoot -Recurse -Force |
  Where-Object { $_.Name -eq 'node_modules' -or $_.Extension -in @('.ts','.tsx') -or $_.Name -match '\.spec\.' }
if ($forbidden) { throw "Forbidden development files found" }
if (-not (Test-Path -LiteralPath $ZipPath -PathType Leaf)) { throw "Missing ZIP" }
Write-Output 'RELEASE_VERIFY_OK'
~~~

- [ ] **步骤 2：运行并验证 RED**

运行：

~~~powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\packaging\windows-portable\verify-release.ps1
~~~

预期：非零退出，因为发布目录或必需文件尚不存在。

---

### 任务 2：Windows 启动器模板

**文件：**
- 创建：`packaging/windows-portable/template/server.ps1`
- 创建：`packaging/windows-portable/template/开始游戏.cmd`
- 创建：`packaging/windows-portable/template/index.html`
- 创建：`packaging/windows-portable/template/README.txt`

**接口：**
- `server.ps1` 接受 `-NoBrowser` 用于自动化冒烟测试，否则打开 `http://127.0.0.1:5200/`。
- `/__health` 返回状态 200，响应体为 `SEVEN_GAMES_OK`。
- `开始游戏.cmd` 从自身目录运行 `server.ps1` 并传递非零退出码。
- `index.html` 为恰好七个 slug 链接到 `games/<slug>/index.html`。

- [ ] **步骤 1：最小化实现 server.ps1**

使用 `System.Net.Sockets.TcpListener`，配合 `IPAddress.Loopback` 与端口 5200。只解析 GET 与 HEAD。解码 URL 一次，用 `System.IO.Path.GetFullPath` 规范化，并要求结果等于包根目录，或以包根目录加目录分隔符开头（使用 `OrdinalIgnoreCase`）。

响应辅助函数契约：

~~~powershell
function Write-Response {
  param(
    [System.IO.Stream]$Stream,
    [int]$Status,
    [string]$Reason,
    [string]$ContentType,
    [byte[]]$Body,
    [bool]$HeadOnly = $false
  )
}
~~~

要求的行为：

- `/` 与目录映射到 `index.html`。
- `/__health` 返回 `SEVEN_GAMES_OK`。
- 已知扩展名获得显式 MIME 类型。
- `games/<slug>/` 下缺失的路径回退到该游戏的 `index.html`。
- 超出包根目录的规范化路径返回 403。
- 未知扩展名返回 415。
- 其他缺失文件返回 404。
- 异常返回通用的 500 响应体，不含绝对文件路径。
- 所有响应都包含 `Content-Length`、`Connection: close`、`Cache-Control: no-cache` 与 `X-Content-Type-Options: nosniff`。

- [ ] **步骤 2：实现 开始游戏.cmd**

所需命令流程：

~~~batch
@echo off
chcp 65001 >nul
cd /d "%~dp0"
where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo [错误] 未找到 Windows PowerShell。
  pause
  exit /b 1
)
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
set "GAME_EXIT=%ERRORLEVEL%"
if not "%GAME_EXIT%"=="0" pause
exit /b %GAME_EXIT%
~~~

- [ ] **步骤 3：创建离线大厅**

复用已有 `launcher/index.html` 的卡片样式与七个游戏链接。把旧的「移动端/LAN/Node/Python 说明」替换为：

“Windows 便携版：所有游戏均在本机离线运行。关闭启动窗口即可停止游戏服务；存档保存在当前浏览器本地。”

文档必须包含恰好七个锚点，其 `href` 值为七个 `games/<slug>/index.html` 路径。

- [ ] **步骤 4：创建接收方 README.txt**

包含确切小节：启动方法、退出方法、存档说明、端口占用、Windows 安全提示、文件完整性。说明无需 Node.js 或 Python，且必须在启动前把文件夹完整解压。

- [ ] **步骤 5：运行模板静态检查**

用 rg 检查 127.0.0.1、端口 5200、`/__health`、`TcpListener`、七个 href 值，以及不存在 `node serve.mjs`/`python -m http.server` 声明。

预期：每个必需模式都存在，且每个被禁止的运行时说明都缺失。

---

### 任务 3：可复现的包构建器

**文件：**
- 创建：`packaging/windows-portable/build.ps1`
- 生成：`release/Seven-Games-Windows-Portable/`
- 生成：`release/Seven-Games-Windows-Portable-2026-08-14.zip`

**接口：**
- `build.ps1` 无必需参数。
- 从自身位置解析工作区根目录。
- 成功时打印 `PACKAGE_BUILD_OK`、发布目录、ZIP 路径、文件计数与字节大小。

- [ ] **步骤 1：实现校验后的固定映射**

使用此精确有序映射：

~~~powershell
$games = @(
  @{ Source='1-AbsurdDecision\dist'; Target='absurd-decision' },
  @{ Source='2-ImpostorLies\dist'; Target='impostor-lies' },
  @{ Source='3-NoServerBoom\dist'; Target='no-server-boom' },
  @{ Source='4-AbsurdCensor\dist'; Target='absurd-censor' },
  @{ Source='5-WhoBrokeProd\dist'; Target='who-broke-prod' },
  @{ Source='6-ShiftingRules\dist'; Target='shifting-rules' },
  @{ Source='7-RidiculousToolbox\dist'; Target='ridiculous-toolbox' }
)
~~~

在写入输出前，要求每个源 `dist/index.html` 以及每个 `index.html` 中引用的 JS/CSS 资源都存在。

- [ ] **步骤 2：实现精确目标的清理与复制**

把 `release/Seven-Games-Windows-Portable` 与 ZIP 解析为绝对路径。在 `Remove-Item` 之前，要求两个目标都是 `workspaceRoot/release` 的直接子项，且精确匹配固定的预期名称。重建发布目录，复制四个模板文件，然后把每个 dist 目录的内容复制进 `games/<slug>/`。

- [ ] **步骤 3：新增包级内容检查**

复制完成后：

- 读取打包后第 2 款游戏的 JavaScript 包，要求包含字符串 `ch8_01`、`ch8_02`、`ch8_03`、`ch8_04` 与 `32`。
- 要求恰好七个游戏目录。
- 拒绝 `node_modules`、TypeScript 源文件、spec 文件、`package.json` 与源码映射。
- 要求所有大厅 href 目标都存在。

- [ ] **步骤 4：创建 ZIP**

对发布目录本身使用 `Compress-Archive`，使解压后生成单一的 `Seven-Games-Windows-Portable` 顶层文件夹。确认归档非空。

- [ ] **步骤 5：运行构建器**

运行：

~~~powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\packaging\windows-portable\build.ps1
~~~

预期：`PACKAGE_BUILD_OK` 与退出码 0。

- [ ] **步骤 6：运行发布校验器并验证 GREEN**

运行任务 1 的命令。

预期：`RELEASE_VERIFY_OK` 与退出码 0。

---

### 任务 4：运行时与浏览器冒烟验证

**文件：**
- 测试：`release/Seven-Games-Windows-Portable/server.ps1`
- 测试：`release/Seven-Games-Windows-Portable/index.html`
- 测试：`release/Seven-Games-Windows-Portable/games/*/`

**接口：**
- 运行时测试仅用 Windows PowerShell 启动打包后的 `server.ps1`；不得调用 Node 或 Python。
- 浏览器测试只读取 localhost 包页面。

- [ ] **步骤 1：不打开浏览器启动打包服务器**

把打包后的 `server.ps1 -NoBrowser` 作为一个可让出的前台进程启动。等待 `/__health` 返回 `SEVEN_GAMES_OK`。

- [ ] **步骤 2：验证 HTTP 行为**

检查：

- `/` 返回 200，且恰好包含七个游戏卡片链接。
- 七个游戏 index 路径都返回 200。
- 每个游戏 index 引用的每个 JS/CSS 资源都返回 200。
- `/__health` 返回 200。
- `/../server.ps1` 及其百分号编码等价形式不会暴露文件内容。
- 缺失的非游戏路径返回 404。

- [ ] **步骤 3：浏览器冒烟全部七款游戏**

在应用内浏览器中打开大厅，点击七个链接中的每一个，验证每个首屏都有游戏专属标题或标识文本，且无控制台错误。对第 2 款游戏，验证主菜单报告总共 32 关，且第 8 章暴露四个谜题条目。

- [ ] **步骤 4：测试 ZIP**

把 ZIP 解压进 `.codex-audit` 下一个唯一命名的审计目录，对该解压出的顶层文件夹运行 `verify-release.ps1`，比较相对文件列表与 SHA-256 哈希和文件夹发布是否一致，然后只删除那个精确的审计解压目录。

- [ ] **步骤 5：停止服务并最终验证**

终止可让出的打包服务器，验证 127.0.0.1:5200 不再有 LISTENING 记录，重跑 `verify-release.ps1`，并报告最终文件夹/ZIP 大小与 ZIP 的 SHA-256。

由于 `D:\games` 不是 Git 仓库，本任务不适用任何 Git 提交步骤。
