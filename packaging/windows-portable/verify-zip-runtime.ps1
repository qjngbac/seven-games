param(
  [string]$ReleaseRoot = (Join-Path $PSScriptRoot '..\..\release\Seven-Games-Windows-Portable'),
  [string]$ZipPath = (Join-Path $PSScriptRoot '..\..\release\Seven-Games-Windows-Portable-2026-08-14.zip')
)

$ErrorActionPreference = 'Stop'

$ReleaseRoot = [System.IO.Path]::GetFullPath($ReleaseRoot)
$ZipPath = [System.IO.Path]::GetFullPath($ZipPath)
$auditBase = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\.codex-audit'))
$auditRoot = Join-Path $auditBase ('zip-runtime-' + [guid]::NewGuid().ToString('N'))
$serverProcess = $null

if (Get-NetTCPConnection -LocalPort 5200 -State Listen -ErrorAction SilentlyContinue) {
  throw 'Port 5200 is already in use before verification'
}
if (-not (Test-Path -LiteralPath $auditBase -PathType Container)) {
  New-Item -ItemType Directory -Path $auditBase | Out-Null
}
New-Item -ItemType Directory -Path $auditRoot | Out-Null

try {
  Expand-Archive -LiteralPath $ZipPath -DestinationPath $auditRoot
  $extractedRoot = Join-Path $auditRoot 'Seven-Games-Windows-Portable'

  & powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass `
    -File (Join-Path $PSScriptRoot 'verify-release.ps1') `
    -ReleaseRoot $extractedRoot `
    -ZipPath $ZipPath
  if ($LASTEXITCODE -ne 0) {
    throw "Extracted release verifier failed with exit code $LASTEXITCODE"
  }

  $sourceFiles = @(Get-ChildItem -LiteralPath $ReleaseRoot -Recurse -File)
  $extractedFiles = @(Get-ChildItem -LiteralPath $extractedRoot -Recurse -File)
  if ($sourceFiles.Count -ne $extractedFiles.Count) {
    throw 'Extracted file count differs from release folder'
  }
  foreach ($sourceFile in $sourceFiles) {
    $relative = $sourceFile.FullName.Substring($ReleaseRoot.Length).TrimStart('\')
    $extractedFile = Join-Path $extractedRoot $relative
    if (-not (Test-Path -LiteralPath $extractedFile -PathType Leaf)) {
      throw "ZIP is missing $relative"
    }
    $sourceHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $sourceFile.FullName).Hash
    $extractedHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $extractedFile).Hash
    if ($sourceHash -ne $extractedHash) {
      throw "ZIP hash mismatch for $relative"
    }
  }
  Write-Output "ZIP_FILE_HASHES_OK=$($sourceFiles.Count)"

  $launchers = @(Get-ChildItem -LiteralPath $extractedRoot -Filter '*.cmd' -File)
  if ($launchers.Count -ne 1) {
    throw "Expected exactly one CMD launcher, found $($launchers.Count)"
  }
  $launcherPath = $launchers[0].FullName
  $launcherBytes = [System.IO.File]::ReadAllBytes($launcherPath)
  $launcherText = [System.Text.Encoding]::UTF8.GetString($launcherBytes)
  $crlfCount = ([regex]::Matches($launcherText, "`r`n")).Count
  $lfOnlyCount = ([regex]::Matches($launcherText, "(?<!`r)`n")).Count
  $hasBom = (
    $launcherBytes.Length -ge 3 -and
    $launcherBytes[0] -eq 0xEF -and
    $launcherBytes[1] -eq 0xBB -and
    $launcherBytes[2] -eq 0xBF
  )
  if ($crlfCount -eq 0 -or $lfOnlyCount -ne 0 -or $hasBom) {
    throw "Invalid ZIP launcher encoding: CRLF=$crlfCount LF_ONLY=$lfOnlyCount BOM=$hasBom"
  }
  Write-Output "ZIP_LAUNCHER_CRLF=$crlfCount LF_ONLY=$lfOnlyCount BOM=$hasBom"

  $serverPath = Join-Path $extractedRoot 'server.ps1'
  $serverProcess = Start-Process -FilePath 'powershell.exe' `
    -ArgumentList @(
      '-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass',
      '-File', ('"' + $serverPath + '"'), '-NoBrowser'
    ) `
    -WorkingDirectory $extractedRoot `
    -WindowStyle Hidden `
    -PassThru

  $health = $null
  $deadline = [DateTime]::UtcNow.AddSeconds(10)
  while ([DateTime]::UtcNow -lt $deadline) {
    if ($serverProcess.HasExited) {
      throw "Extracted server exited early with code $($serverProcess.ExitCode)"
    }
    try {
      $health = Invoke-WebRequest -UseBasicParsing `
        -Uri 'http://127.0.0.1:5200/__health' `
        -TimeoutSec 1
      break
    }
    catch {
      Start-Sleep -Milliseconds 150
    }
  }
  if ($null -eq $health -or
      $health.StatusCode -ne 200 -or
      $health.Content -ne 'SEVEN_GAMES_OK') {
    throw 'Extracted server health check failed'
  }

  $slugs = @(
    'absurd-decision',
    'impostor-lies',
    'no-server-boom',
    'absurd-censor',
    'who-broke-prod',
    'shifting-rules',
    'ridiculous-toolbox'
  )
  $lobby = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:5200/' -TimeoutSec 5
  if ($lobby.StatusCode -ne 200) {
    throw 'Lobby did not return 200'
  }
  $linkCount = ([regex]::Matches(
    $lobby.Content,
    'href="games/[^/]+/index\.html"'
  )).Count
  if ($linkCount -ne 7) {
    throw "Lobby link count was $linkCount"
  }

  $assetCount = 0
  foreach ($slug in $slugs) {
    $gameUrl = "http://127.0.0.1:5200/games/$slug/index.html"
    $gameResponse = Invoke-WebRequest -UseBasicParsing -Uri $gameUrl -TimeoutSec 5
    if ($gameResponse.StatusCode -ne 200) {
      throw "$slug did not return 200"
    }
    $assetMatches = [regex]::Matches(
      $gameResponse.Content,
      '(?:src|href)="([^"]+\.(?:js|css))"'
    )
    foreach ($assetMatch in $assetMatches) {
      $assetUrl = (New-Object System.Uri(
        ([System.Uri]$gameUrl),
        $assetMatch.Groups[1].Value
      )).AbsoluteUri
      $assetResponse = Invoke-WebRequest -UseBasicParsing -Uri $assetUrl -TimeoutSec 5
      if ($assetResponse.StatusCode -ne 200) {
        throw "Asset did not return 200: $assetUrl"
      }
      $assetCount++
    }
  }
  Write-Output "RUNTIME_HTTP_OK GAMES=$($slugs.Count) ASSETS=$assetCount"
}
finally {
  if ($null -ne $serverProcess -and -not $serverProcess.HasExited) {
    Stop-Process -Id $serverProcess.Id -Force
    $serverProcess.WaitForExit(5000) | Out-Null
  }
  if (Test-Path -LiteralPath $auditRoot) {
    $resolvedAudit = [System.IO.Path]::GetFullPath(
      (Resolve-Path -LiteralPath $auditRoot).Path
    )
    $expectedPrefix = $auditBase.TrimEnd('\') + '\zip-runtime-'
    if (-not $resolvedAudit.StartsWith(
      $expectedPrefix,
      [System.StringComparison]::OrdinalIgnoreCase
    )) {
      throw "Refusing to delete unexpected audit path: $resolvedAudit"
    }
    [System.IO.Directory]::Delete($resolvedAudit, $true)
  }
}

Start-Sleep -Milliseconds 300
if (Get-NetTCPConnection -LocalPort 5200 -State Listen -ErrorAction SilentlyContinue) {
  throw 'Port 5200 remains in use after verification'
}

$zip = Get-Item -LiteralPath $ZipPath
$zipHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $ZipPath).Hash
Write-Output 'PORT_5200_FREE'
Write-Output "ZIP_BYTES=$($zip.Length)"
Write-Output "ZIP_SHA256=$zipHash"
Write-Output 'ZIP_RUNTIME_VERIFY_OK'
