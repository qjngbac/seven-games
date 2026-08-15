# GitHub 命令行发布指南

本指南用于将当前工作区发布为公开仓库 `qjngbac/seven-games`，并创建稳定版本
`v1.0.0`。

仓库采用 `GPL-3.0-only` 许可证。Release 支持 Windows 10 和 Windows 11；
玩家不需要安装 Node.js 或 Python。

以下命令均在 PowerShell 中运行。会创建 Git 历史或写入 GitHub 的步骤已单独列出。

## 1. 工具与身份验证

检查 Git 和 GitHub CLI：

```powershell
git --version
gh --version
```

如果系统找不到 `gh`，安装官方 GitHub CLI：

```powershell
winget install --id GitHub.cli --source winget
```

安装后重新打开终端窗口，然后登录：

```powershell
gh auth login --hostname github.com --git-protocol https --web
gh auth status --hostname github.com

$login = gh api user --jq .login
if ($login -ne 'qjngbac') {
  throw "预期登录账号为 qjngbac，当前账号为 $login"
}
```

## 2. 本地发布前检查

进入工作区并验证便携包：

```powershell
Set-Location D:\games

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass `
  -File .\packaging\windows-portable\verify-release.ps1 `
  -ZipPath .\release\Games.zip

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass `
  -File .\packaging\windows-portable\verify-zip-runtime.ps1 `
  -ZipPath .\release\Games.zip
```

重新计算并比较 Release 校验值：

```powershell
$expected = ((Get-Content .\release\SHA256SUMS.txt -Raw).Trim() -split '\s+')[0]
$actual = (Get-FileHash -Algorithm SHA256 .\release\Games.zip).Hash
if ($actual -ne $expected) { throw 'Games.zip 校验值不匹配' }
"SHA-256 校验通过：$actual"
```

首次提交前检查可能包含凭据的文件名：

```powershell
$candidates = rg --files --hidden `
  -g '!**/node_modules/**' `
  -g '!**/dist/**' `
  -g '!release/**' `
  -g '!.codex-audit/**'

$candidates | Where-Object {
  $_ -match '(^|[\\/])\.env($|\.)' -or
  $_ -match '\.(pem|p12|pfx|key)$' -or
  $_ -match '(^|[\\/])(id_rsa|id_ed25519)$'
}
```

检查常见密钥格式。发现匹配项时必须人工检查，不得提交真实令牌或私钥：

```powershell
$secretPattern = '(' + (@(
  [regex]::Escape('github' + '_pat_')
  [regex]::Escape('gh' + 'p_')
  [regex]::Escape('gh' + 'o_')
) -join '|') + '|sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)'

rg -n --hidden `
  -g '!**/node_modules/**' `
  -g '!**/dist/**' `
  -g '!release/**' `
  -g '!.codex-audit/**' `
  $secretPattern .
```

正常情况下没有输出。任何匹配项都只代表需要审查，不能据此打印或提交匹配到的值。

## 3. 初始化并检查首次提交

初始化 `main` 分支。如果本机尚未配置提交者信息，再进行配置：

```powershell
Set-Location D:\games
git init -b main

if (-not (git config user.name)) {
  git config user.name 'qjngbac'
}
if (-not (git config user.email)) {
  $gitEmail = Read-Host '请输入 GitHub 已验证邮箱或 GitHub noreply 邮箱'
  git config user.email $gitEmail
}
```

暂存源码，并在提交前检查全部内容：

```powershell
git add --all
git status --short
git status --short --ignored

$staged = @(git diff --cached --name-only)
$forbidden = @($staged | Where-Object {
  $_ -match '(^|/)(node_modules|dist|release|\.codex-audit)(/|$)'
})
if ($forbidden.Count -gt 0) {
  $forbidden
  throw '暂存区包含禁止提交的生成目录'
}

$packageManifests = @($staged | Where-Object {
  $_ -match '^[1-7]-[^/]+/package\.json$'
})
if ($packageManifests.Count -ne 7) {
  throw "暂存区应包含七个游戏的 package.json，实际为 $($packageManifests.Count) 个"
}
```

检查暂存区差异，并再次扫描暂存内容中的密钥：

```powershell
git diff --cached --stat
git diff --cached --check
git diff --cached -- . ':(exclude)LICENSE'

$secretPattern = '(' + (@(
  [regex]::Escape('github' + '_pat_')
  [regex]::Escape('gh' + 'p_')
  [regex]::Escape('gh' + 'o_')
) -join '|') + '|sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)'

git diff --cached | rg $secretPattern
```

最后一条 `rg` 命令应当没有输出。人工检查完成后创建首次提交：

```powershell
git commit -m '发布七款小游戏 v1.0.0'
git status --short
```

## 4. 创建并推送公开仓库

仓库 Description：

```text
七款原创浏览器解谜小游戏合集，提供无需 Node.js 或 Python 的 Windows 离线便携版。
```

创建 `qjngbac/seven-games`、添加远程 `origin` 并推送 `main`：

```powershell
$description = '七款原创浏览器解谜小游戏合集，提供无需 Node.js 或 Python 的 Windows 离线便携版。'

gh repo create qjngbac/seven-games `
  --public `
  --source=. `
  --remote=origin `
  --push `
  --description $description
```

如果远程仓库已经存在，不要重复运行 `gh repo create`，改为连接并推送：

```powershell
git remote add origin https://github.com/qjngbac/seven-games.git
git push -u origin main
```

创建标签前读取并核对远程信息：

```powershell
git remote -v
gh repo view qjngbac/seven-games `
  --json nameWithOwner,visibility,defaultBranchRef,description,url
```

## 5. 创建并发布 v1.0.0

在已检查的首次提交上创建附注标签并推送：

```powershell
git tag -a v1.0.0 -m '七款小游戏 Windows 便携版 v1.0.0'
git push origin v1.0.0
git ls-remote --tags origin refs/tags/v1.0.0
```

使用已推送的标签创建 Release，并上传两个附件：

```powershell
gh release create v1.0.0 `
  '.\release\Games.zip#Windows 便携版' `
  '.\release\SHA256SUMS.txt#SHA-256 校验值' `
  --repo qjngbac/seven-games `
  --verify-tag `
  --title '七款小游戏 Windows 便携版 v1.0.0' `
  --notes-file .\RELEASE_NOTES_v1.0.0.md `
  --latest
```

读取 Release 信息进行核对：

```powershell
gh release view v1.0.0 `
  --repo qjngbac/seven-games `
  --json tagName,name,isDraft,isPrerelease,assets,url
```

附件名称必须恰好为 `Games.zip` 和 `SHA256SUMS.txt`。打开公开页面：

```powershell
gh release view v1.0.0 --repo qjngbac/seven-games --web
```

## 6. 后续源码更新

首次发布后的普通源码更新：

```powershell
Set-Location D:\games
git status --short
git add --all
git diff --cached --check
git diff --cached --stat
git commit -m '修复：说明本次修改内容'
git push origin main
```

## 7. 后续版本发布

先构建并验证新的便携 ZIP，再替换 `release/Games.zip` 并重新生成
`release/SHA256SUMS.txt`。这两个文件继续由 Git 忽略。创建标签前，应先提交源码和
对应的新 Release Notes 文件。

以下为增加兼容内容时的示例：

```powershell
$version = 'v1.1.0'
$title = '七款小游戏 Windows 便携版 v1.1.0'
$notes = '.\RELEASE_NOTES_v1.1.0.md'

git add --all
git commit -m '新增：为 v1.1.0 增加游戏内容'
git push origin main

git tag -a $version -m $title
git push origin $version

gh release create $version `
  '.\release\Games.zip#Windows 便携版' `
  '.\release\SHA256SUMS.txt#SHA-256 校验值' `
  --repo qjngbac/seven-games `
  --verify-tag `
  --title $title `
  --notes-file $notes `
  --latest
```

修复错误使用补丁版本号，例如 `v1.0.1`；增加兼容内容使用次版本号，例如
`v1.1.0`；不兼容修改使用主版本号。
