# 七款小游戏

这是一个包含七款原创浏览器解谜小游戏的合集仓库，同时提供无需玩家安装额外运行环境的
Windows 离线便携版。

仓库包含完整源码、自动化测试、开发文档、统一启动大厅和 Windows 打包工具。

## 游戏列表

| 编号 | 目录 | 游戏 | 类型 |
|---|---|---|---|
| 1 | `1-AbsurdDecision` | 荒诞情境判断游戏 | 情境判断与资源决策 |
| 2 | `2-ImpostorLies` | 伪装者逻辑推理游戏 | 真假话与身份推理 |
| 3 | `3-NoServerBoom` | 错误操作模拟器 | 故障排查与操作模拟 |
| 4 | `4-AbsurdCensor` | 有限信息审查游戏 | 文档审查与规则判断 |
| 5 | `5-WhoBrokeProd` | 多人对话推理游戏 | 对话、证据与责任推理 |
| 6 | `6-ShiftingRules` | 规则变化反应判断游戏 | 动态规则与反应挑战 |
| 7 | `7-RidiculousToolbox` | 物品组合解谜游戏 | 道具组合与场景解谜 |

## 下载与运行

请从仓库的
[最新 GitHub Release](https://github.com/qjngbac/seven-games/releases/latest)
下载 `Games.zip`。如果只是体验游戏，不要下载 GitHub 自动生成的
`Source code (zip)`。

首个稳定版本为
[`v1.0.0`](https://github.com/qjngbac/seven-games/releases/tag/v1.0.0)。

玩家环境要求：

- Windows 10 或 Windows 11；
- 现代网页浏览器；
- 不需要安装 Node.js、Python 或 npm；
- 下载完成后不需要联网。

运行步骤：

1. 完整解压 `Games.zip`，不要直接在压缩包预览中运行。
2. 打开解压后的 `Seven-Games-Windows-Portable` 文件夹。
3. 双击 `开始游戏.cmd`。
4. 启动器会在默认浏览器中打开 `http://127.0.0.1:5200/`。
5. 游戏期间保持启动窗口开启；关闭窗口即可停止本地服务。

本地服务只监听 `127.0.0.1`。游戏进度和设置保存在当前浏览器针对该地址的
本地存储中。

### 校验下载文件

将 `SHA256SUMS.txt` 和 `Games.zip` 下载到同一目录，然后在该目录运行
PowerShell：

```powershell
$expected = ((Get-Content .\SHA256SUMS.txt -Raw).Trim() -split '\s+')[0]
$actual = (Get-FileHash -Algorithm SHA256 .\Games.zip).Hash
if ($actual -ne $expected) { throw 'Games.zip 校验值不匹配' }
"SHA-256 校验通过：$actual"
```

## 开发

七款游戏均使用 Vite 和 TypeScript。第一至第五款及第七款使用 Vue，第六款使用
Phaser。只有参与开发时才需要安装较新的 Node.js 和 npm。

在 PowerShell 中安装依赖、运行测试、执行类型检查并构建全部游戏：

```powershell
$games = @(
  '1-AbsurdDecision',
  '2-ImpostorLies',
  '3-NoServerBoom',
  '4-AbsurdCensor',
  '5-WhoBrokeProd',
  '6-ShiftingRules',
  '7-RidiculousToolbox'
)

foreach ($game in $games) {
  Push-Location $game
  try {
    npm install
    npm test
    npm run typecheck
    npm run build
  }
  finally {
    Pop-Location
  }
}
```

构建并验证 Windows 便携包：

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass `
  -File .\packaging\windows-portable\build.ps1

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass `
  -File .\packaging\windows-portable\verify-release.ps1

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass `
  -File .\packaging\windows-portable\verify-zip-runtime.ps1
```

打包脚本以七个 `dist` 目录作为输入。生成的 `dist`、`release` 和
`node_modules` 目录不会进入 Git 历史。

## 仓库结构

```text
1-AbsurdDecision/ ... 7-RidiculousToolbox/  七款游戏的源码与测试
launcher/                                 开发环境统一启动大厅
packaging/windows-portable/               Windows 打包与验证工具
docs/                                     设计、计划和发布指南
七款小游戏完整开发文档/                    七款游戏的详细开发文档
```

首次发布及后续版本的完整命令请参阅
[`docs/GITHUB_PUBLISH.md`](docs/GITHUB_PUBLISH.md)。

## 许可证

版权所有（C）2026 qjngbac。

本项目采用 GNU 通用公共许可证第 3 版（`GPL-3.0-only`）发布，详见
[`LICENSE`](LICENSE)。
