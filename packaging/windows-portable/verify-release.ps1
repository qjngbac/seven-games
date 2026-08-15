param(
  [string]$ReleaseRoot = (Join-Path $PSScriptRoot '..\..\release\Seven-Games-Windows-Portable'),
  [string]$ZipPath = (Join-Path $PSScriptRoot '..\..\release\Seven-Games-Windows-Portable-2026-08-14.zip')
)

$ErrorActionPreference = 'Stop'

$ReleaseRoot = [System.IO.Path]::GetFullPath($ReleaseRoot)
$ZipPath = [System.IO.Path]::GetFullPath($ZipPath)
$expectedGames = @(
  'absurd-decision',
  'impostor-lies',
  'no-server-boom',
  'absurd-censor',
  'who-broke-prod',
  'shifting-rules',
  'ridiculous-toolbox'
)

function Assert-LauncherInvokesServer {
  param([string]$LauncherPath)

  $auditBase = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot '..\..\.codex-audit')
  )
  if (-not (Test-Path -LiteralPath $auditBase -PathType Container)) {
    New-Item -ItemType Directory -Path $auditBase | Out-Null
  }

  $auditRoot = Join-Path $auditBase ("launcher-test-" + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $auditRoot | Out-Null
  try {
    Copy-Item -LiteralPath $LauncherPath -Destination (Join-Path $auditRoot '开始游戏.cmd')
    $stub = @'
[System.IO.File]::WriteAllText(
  (Join-Path $PSScriptRoot 'launcher-ok.txt'),
  'LAUNCHER_OK'
)
exit 0
'@
    [System.IO.File]::WriteAllText(
      (Join-Path $auditRoot 'server.ps1'),
      $stub,
      (New-Object System.Text.UTF8Encoding($true))
    )

    $process = Start-Process -FilePath $env:ComSpec `
      -ArgumentList '/d /c call 开始游戏.cmd' `
      -WorkingDirectory $auditRoot `
      -WindowStyle Hidden `
      -PassThru
    if (-not $process.WaitForExit(10000)) {
      $process.Kill()
      throw 'Launcher did not finish within 10 seconds'
    }
    if ($process.ExitCode -ne 0) {
      throw "Launcher exited with code $($process.ExitCode) before invoking server.ps1"
    }

    $markerPath = Join-Path $auditRoot 'launcher-ok.txt'
    if (-not (Test-Path -LiteralPath $markerPath -PathType Leaf)) {
      throw 'Launcher did not invoke server.ps1'
    }
    if ((Get-Content -LiteralPath $markerPath -Raw) -ne 'LAUNCHER_OK') {
      throw 'Launcher server marker was invalid'
    }
  }
  finally {
    if (Test-Path -LiteralPath $auditRoot) {
      [System.IO.Directory]::Delete($auditRoot, $true)
    }
  }
}

if (-not (Test-Path -LiteralPath $ReleaseRoot -PathType Container)) {
  throw "Missing release directory: $ReleaseRoot"
}

foreach ($required in @('开始游戏.cmd', 'server.ps1', 'README.txt', 'index.html')) {
  if (-not (Test-Path -LiteralPath (Join-Path $ReleaseRoot $required) -PathType Leaf)) {
    throw "Missing required file: $required"
  }
}

Assert-LauncherInvokesServer -LauncherPath (Join-Path $ReleaseRoot '开始游戏.cmd')

$gameRoot = Join-Path $ReleaseRoot 'games'
$actualGames = @(
  Get-ChildItem -LiteralPath $gameRoot -Directory |
    Select-Object -ExpandProperty Name |
    Sort-Object
)
if (($actualGames -join '|') -ne (($expectedGames | Sort-Object) -join '|')) {
  throw "Game directory set differs from the required seven games"
}

foreach ($game in $expectedGames) {
  $indexPath = Join-Path $ReleaseRoot "games\$game\index.html"
  if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) {
    throw "Missing game index: $game"
  }

  $index = Get-Content -LiteralPath $indexPath -Raw -Encoding UTF8
  $assetMatches = [regex]::Matches($index, '(?:src|href)="([^"]+\.(?:js|css))"')
  if ($assetMatches.Count -eq 0) {
    throw "No JavaScript or CSS assets referenced by: $game"
  }
  foreach ($match in $assetMatches) {
    $relativeAsset = $match.Groups[1].Value.TrimStart('.', '/').Replace('/', '\')
    $assetPath = Join-Path (Split-Path -Parent $indexPath) $relativeAsset
    if (-not (Test-Path -LiteralPath $assetPath -PathType Leaf)) {
      throw ("Missing referenced asset for " + $game + ": " + $relativeAsset)
    }
  }
}

$forbidden = @(
  Get-ChildItem -LiteralPath $ReleaseRoot -Recurse -Force |
    Where-Object {
      $_.Name -eq 'node_modules' -or
      $_.Name -eq 'package.json' -or
      $_.Extension -in @('.ts', '.tsx', '.map') -or
      $_.Name -match '\.spec\.'
    }
)
if ($forbidden.Count -gt 0) {
  throw "Forbidden development files found: $($forbidden[0].FullName)"
}

$lobby = Get-Content -LiteralPath (Join-Path $ReleaseRoot 'index.html') -Raw -Encoding UTF8
$lobbyLinks = @([regex]::Matches($lobby, 'href="games/([^/]+)/index\.html"'))
if ($lobbyLinks.Count -ne 7) {
  throw "Lobby must contain exactly seven game links; found $($lobbyLinks.Count)"
}
foreach ($game in $expectedGames) {
  $needle = 'href="games/' + $game + '/index.html"'
  if (-not $lobby.Contains($needle)) {
    throw "Lobby link missing for: $game"
  }
}

if (-not (Test-Path -LiteralPath $ZipPath -PathType Leaf)) {
  throw "Missing ZIP: $ZipPath"
}
if ((Get-Item -LiteralPath $ZipPath).Length -le 0) {
  throw "ZIP is empty: $ZipPath"
}

$fileCount = @(Get-ChildItem -LiteralPath $ReleaseRoot -Recurse -File).Count
Write-Output 'RELEASE_VERIFY_OK'
Write-Output "RELEASE_FILES=$fileCount"
Write-Output "ZIP_BYTES=$((Get-Item -LiteralPath $ZipPath).Length)"
