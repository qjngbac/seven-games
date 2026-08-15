$ErrorActionPreference = 'Stop'

$workspaceRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$templateRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'template'))
$releaseBase = [System.IO.Path]::GetFullPath((Join-Path $workspaceRoot 'release'))
$releaseRoot = [System.IO.Path]::GetFullPath(
  (Join-Path $releaseBase 'Seven-Games-Windows-Portable')
)
$zipPath = [System.IO.Path]::GetFullPath(
  (Join-Path $releaseBase 'Seven-Games-Windows-Portable-2026-08-14.zip')
)

$games = @(
  @{ Source = '1-AbsurdDecision\dist'; Target = 'absurd-decision' },
  @{ Source = '2-ImpostorLies\dist'; Target = 'impostor-lies' },
  @{ Source = '3-NoServerBoom\dist'; Target = 'no-server-boom' },
  @{ Source = '4-AbsurdCensor\dist'; Target = 'absurd-censor' },
  @{ Source = '5-WhoBrokeProd\dist'; Target = 'who-broke-prod' },
  @{ Source = '6-ShiftingRules\dist'; Target = 'shifting-rules' },
  @{ Source = '7-RidiculousToolbox\dist'; Target = 'ridiculous-toolbox' }
)

function Assert-ExactOutputTargets {
  $expectedRelease = Join-Path $releaseBase 'Seven-Games-Windows-Portable'
  $expectedZip = Join-Path $releaseBase 'Seven-Games-Windows-Portable-2026-08-14.zip'
  if (-not $releaseRoot.Equals(
    [System.IO.Path]::GetFullPath($expectedRelease),
    [System.StringComparison]::OrdinalIgnoreCase
  )) {
    throw 'Release directory resolved outside the fixed target'
  }
  if (-not $zipPath.Equals(
    [System.IO.Path]::GetFullPath($expectedZip),
    [System.StringComparison]::OrdinalIgnoreCase
  )) {
    throw 'ZIP resolved outside the fixed target'
  }
  if (-not ([System.IO.Path]::GetDirectoryName($releaseRoot)).Equals(
    $releaseBase,
    [System.StringComparison]::OrdinalIgnoreCase
  )) {
    throw 'Release directory is not a direct child of the release folder'
  }
  if (-not ([System.IO.Path]::GetDirectoryName($zipPath)).Equals(
    $releaseBase,
    [System.StringComparison]::OrdinalIgnoreCase
  )) {
    throw 'ZIP is not a direct child of the release folder'
  }
}

function Assert-DistAssets {
  param([string]$DistRoot, [string]$GameName)

  $indexPath = Join-Path $DistRoot 'index.html'
  if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) {
    throw "Missing dist/index.html for $GameName"
  }
  $index = Get-Content -LiteralPath $indexPath -Raw -Encoding UTF8
  $assetMatches = [regex]::Matches($index, '(?:src|href)="([^"]+\.(?:js|css))"')
  if ($assetMatches.Count -eq 0) {
    throw "No JS/CSS assets referenced by $GameName"
  }
  foreach ($match in $assetMatches) {
    $relativeAsset = $match.Groups[1].Value.TrimStart('.', '/').Replace('/', '\')
    $assetPath = Join-Path $DistRoot $relativeAsset
    if (-not (Test-Path -LiteralPath $assetPath -PathType Leaf)) {
      throw ("Missing dist asset for " + $GameName + ": " + $relativeAsset)
    }
  }
}

Assert-ExactOutputTargets

foreach ($templateFile in @('server.ps1', '开始游戏.cmd', 'README.txt', 'index.html')) {
  if (-not (Test-Path -LiteralPath (Join-Path $templateRoot $templateFile) -PathType Leaf)) {
    throw "Missing package template: $templateFile"
  }
}

foreach ($game in $games) {
  $sourceRoot = [System.IO.Path]::GetFullPath((Join-Path $workspaceRoot $game.Source))
  Assert-DistAssets -DistRoot $sourceRoot -GameName $game.Target
}

if (-not (Test-Path -LiteralPath $releaseBase -PathType Container)) {
  New-Item -ItemType Directory -Path $releaseBase | Out-Null
}
if (Test-Path -LiteralPath $releaseRoot) {
  Remove-Item -LiteralPath $releaseRoot -Recurse -Force
}
if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Path $releaseRoot | Out-Null
$releaseGames = New-Item -ItemType Directory -Path (Join-Path $releaseRoot 'games')

foreach ($templateFile in @('server.ps1', '开始游戏.cmd', 'README.txt', 'index.html')) {
  $templatePath = Join-Path $templateRoot $templateFile
  $releasePath = Join-Path $releaseRoot $templateFile
  if ($templateFile -eq '开始游戏.cmd') {
    $launcher = [System.IO.File]::ReadAllText($templatePath)
    $launcher = $launcher -replace "`r?`n", "`r`n"
    [System.IO.File]::WriteAllText(
      $releasePath,
      $launcher,
      (New-Object System.Text.UTF8Encoding($false))
    )
  }
  else {
    Copy-Item -LiteralPath $templatePath -Destination $releasePath
  }
}

foreach ($game in $games) {
  $sourceRoot = [System.IO.Path]::GetFullPath((Join-Path $workspaceRoot $game.Source))
  $targetRoot = Join-Path $releaseGames.FullName $game.Target
  New-Item -ItemType Directory -Path $targetRoot | Out-Null
  Get-ChildItem -LiteralPath $sourceRoot -Force |
    Copy-Item -Destination $targetRoot -Recurse -Force
}

$actualGames = @(
  Get-ChildItem -LiteralPath $releaseGames.FullName -Directory |
    Select-Object -ExpandProperty Name
)
if ($actualGames.Count -ne 7) {
  throw "Expected exactly seven packaged games, found $($actualGames.Count)"
}

$forbidden = @(
  Get-ChildItem -LiteralPath $releaseRoot -Recurse -Force |
    Where-Object {
      $_.Name -eq 'node_modules' -or
      $_.Name -eq 'package.json' -or
      $_.Extension -in @('.ts', '.tsx', '.map') -or
      $_.Name -match '\.spec\.'
    }
)
if ($forbidden.Count -gt 0) {
  throw "Development file copied into release: $($forbidden[0].FullName)"
}

$lobby = Get-Content -LiteralPath (Join-Path $releaseRoot 'index.html') -Raw -Encoding UTF8
foreach ($game in $games) {
  $link = 'href="games/' + $game.Target + '/index.html"'
  if (-not $lobby.Contains($link)) {
    throw "Lobby link missing for $($game.Target)"
  }
  if (-not (Test-Path -LiteralPath (Join-Path $releaseRoot ("games\" + $game.Target + "\index.html")))) {
    throw "Lobby target missing for $($game.Target)"
  }
}

$game2Index = Join-Path $releaseRoot 'games\impostor-lies\index.html'
$game2Html = Get-Content -LiteralPath $game2Index -Raw -Encoding UTF8
$game2JsMatch = [regex]::Match($game2Html, 'src="([^"]+\.js)"')
if (-not $game2JsMatch.Success) {
  throw 'Game 2 JavaScript bundle reference missing'
}
$game2JsRelative = $game2JsMatch.Groups[1].Value.TrimStart('.', '/').Replace('/', '\')
$game2Bundle = Get-Content -LiteralPath (Join-Path (Split-Path $game2Index -Parent) $game2JsRelative) -Raw -Encoding UTF8
foreach ($puzzleId in @('ch8_01', 'ch8_02', 'ch8_03', 'ch8_04')) {
  if (-not $game2Bundle.Contains($puzzleId)) {
    throw "Game 2 package is missing $puzzleId"
  }
}

Compress-Archive -LiteralPath $releaseRoot -DestinationPath $zipPath -CompressionLevel Optimal
if (-not (Test-Path -LiteralPath $zipPath -PathType Leaf) -or
    (Get-Item -LiteralPath $zipPath).Length -le 0) {
  throw 'ZIP creation failed'
}

$releaseFiles = @(Get-ChildItem -LiteralPath $releaseRoot -Recurse -File)
$releaseBytes = ($releaseFiles | Measure-Object -Property Length -Sum).Sum
$zipBytes = (Get-Item -LiteralPath $zipPath).Length
Write-Output 'PACKAGE_BUILD_OK'
Write-Output "RELEASE_ROOT=$releaseRoot"
Write-Output "ZIP_PATH=$zipPath"
Write-Output "RELEASE_FILES=$($releaseFiles.Count)"
Write-Output "RELEASE_BYTES=$releaseBytes"
Write-Output "ZIP_BYTES=$zipBytes"
