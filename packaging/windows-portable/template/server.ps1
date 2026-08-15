param(
  [switch]$NoBrowser,
  [ValidateRange(1024, 65535)]
  [int]$Port = 5200
)

$ErrorActionPreference = 'Stop'
$port = $Port
$root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$rootPrefix = $root.TrimEnd(
  [System.IO.Path]::DirectorySeparatorChar,
  [System.IO.Path]::AltDirectorySeparatorChar
) + [System.IO.Path]::DirectorySeparatorChar
$crlf = [Environment]::NewLine
$utf8 = New-Object System.Text.UTF8Encoding($false)
$ascii = [System.Text.Encoding]::ASCII

$mimeTypes = @{
  '.html'  = 'text/html; charset=utf-8'
  '.js'    = 'text/javascript; charset=utf-8'
  '.mjs'   = 'text/javascript; charset=utf-8'
  '.css'   = 'text/css; charset=utf-8'
  '.json'  = 'application/json; charset=utf-8'
  '.svg'   = 'image/svg+xml'
  '.png'   = 'image/png'
  '.jpg'   = 'image/jpeg'
  '.jpeg'  = 'image/jpeg'
  '.gif'   = 'image/gif'
  '.ico'   = 'image/x-icon'
  '.woff'  = 'font/woff'
  '.woff2' = 'font/woff2'
  '.txt'   = 'text/plain; charset=utf-8'
}

function Write-Response {
  param(
    [System.IO.Stream]$Stream,
    [int]$Status,
    [string]$Reason,
    [string]$ContentType,
    [byte[]]$Body,
    [bool]$HeadOnly = $false
  )

  if ($null -eq $Body) {
    $Body = [byte[]]::new(0)
  }
  $headers =
    "HTTP/1.1 $Status $Reason" + $crlf +
    "Content-Type: $ContentType" + $crlf +
    "Content-Length: $($Body.Length)" + $crlf +
    "Connection: close" + $crlf +
    "Cache-Control: no-cache" + $crlf +
    "X-Content-Type-Options: nosniff" + $crlf + $crlf
  $headerBytes = $ascii.GetBytes($headers)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if (-not $HeadOnly -and $Body.Length -gt 0) {
    $Stream.Write($Body, 0, $Body.Length)
  }
  $Stream.Flush()
}

function Write-TextResponse {
  param(
    [System.IO.Stream]$Stream,
    [int]$Status,
    [string]$Reason,
    [string]$Text,
    [bool]$HeadOnly = $false
  )
  Write-Response -Stream $Stream -Status $Status -Reason $Reason -ContentType 'text/plain; charset=utf-8' -Body $utf8.GetBytes($Text) -HeadOnly $HeadOnly
}

function Test-InPackageRoot {
  param([string]$Candidate)
  return $Candidate.Equals($root, [System.StringComparison]::OrdinalIgnoreCase) -or
    $Candidate.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)
}

$activeListeners = @(
  [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().
    GetActiveTcpListeners() |
    Where-Object { $_.Port -eq $port }
)
if ($activeListeners.Count -gt 0) {
  Write-Host ''
  Write-Host "[错误] 无法启动游戏服务。端口 $port 已被占用。" -ForegroundColor Red
  Write-Host '请关闭之前打开的游戏启动窗口，然后重试。'
  exit 2
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
$listener.Server.ExclusiveAddressUse = $true
try {
  $listener.Start()
} catch {
  Write-Host ''
  Write-Host "[错误] 无法启动游戏服务。端口 $port 可能已被占用。" -ForegroundColor Red
  Write-Host '请关闭之前打开的游戏启动窗口，然后重试。'
  exit 2
}

Write-Host ''
Write-Host '  七款小游戏 Windows 便携版已启动' -ForegroundColor Cyan
Write-Host "  地址：http://127.0.0.1:$port/"
Write-Host '  关闭此窗口或按 Ctrl+C 即可停止。'
Write-Host ''

if (-not $NoBrowser) {
  try {
    Start-Process "http://127.0.0.1:$port/"
  } catch {
    Write-Host '[提示] 无法自动打开浏览器，请手动复制上面的地址。' -ForegroundColor Yellow
  }
}

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = New-Object System.IO.StreamReader(
        $stream,
        $ascii,
        $false,
        8192,
        $true
      )
      $requestLine = $reader.ReadLine()
      while ($true) {
        $headerLine = $reader.ReadLine()
        if ($null -eq $headerLine -or $headerLine.Length -eq 0) {
          break
        }
      }

      if ([string]::IsNullOrWhiteSpace($requestLine)) {
        Write-TextResponse -Stream $stream -Status 400 -Reason 'Bad Request' -Text '400 Bad Request'
        continue
      }

      $parts = $requestLine.Split(' ')
      if ($parts.Count -lt 3) {
        Write-TextResponse -Stream $stream -Status 400 -Reason 'Bad Request' -Text '400 Bad Request'
        continue
      }

      $method = $parts[0].ToUpperInvariant()
      $headOnly = $method -eq 'HEAD'
      if ($method -ne 'GET' -and -not $headOnly) {
        Write-TextResponse -Stream $stream -Status 405 -Reason 'Method Not Allowed' -Text '405 Method Not Allowed' -HeadOnly $headOnly
        continue
      }

      $rawPath = $parts[1].Split('?')[0]
      try {
        $urlPath = [System.Uri]::UnescapeDataString($rawPath)
      } catch {
        Write-TextResponse -Stream $stream -Status 400 -Reason 'Bad Request' -Text '400 Bad Request'
        continue
      }

      if ($urlPath.IndexOf([char]0) -ge 0) {
        Write-TextResponse -Stream $stream -Status 400 -Reason 'Bad Request' -Text '400 Bad Request'
        continue
      }
      if ($urlPath -eq '/__health') {
        Write-TextResponse -Stream $stream -Status 200 -Reason 'OK' -Text 'SEVEN_GAMES_OK' -HeadOnly $headOnly
        continue
      }

      $urlPath = $urlPath.Replace('\', '/')
      if ($urlPath -eq '/') {
        $urlPath = '/index.html'
      }
      $relativePath = $urlPath.TrimStart('/').Replace(
        '/',
        [System.IO.Path]::DirectorySeparatorChar
      )

      try {
        $candidate = [System.IO.Path]::GetFullPath((Join-Path $root $relativePath))
      } catch {
        Write-TextResponse -Stream $stream -Status 400 -Reason 'Bad Request' -Text '400 Bad Request'
        continue
      }

      if (-not (Test-InPackageRoot -Candidate $candidate)) {
        Write-TextResponse -Stream $stream -Status 403 -Reason 'Forbidden' -Text '403 Forbidden'
        continue
      }

      if (Test-Path -LiteralPath $candidate -PathType Container) {
        $candidate = Join-Path $candidate 'index.html'
      }

      if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        $segments = @($urlPath.Trim('/').Split('/'))
        if ($segments.Count -ge 2 -and $segments[0] -eq 'games') {
          $gameIndex = [System.IO.Path]::GetFullPath(
            (Join-Path $root ("games\" + $segments[1] + "\index.html"))
          )
          if ((Test-InPackageRoot -Candidate $gameIndex) -and
              (Test-Path -LiteralPath $gameIndex -PathType Leaf)) {
            $candidate = $gameIndex
          } else {
            Write-TextResponse -Stream $stream -Status 404 -Reason 'Not Found' -Text '404 Not Found'
            continue
          }
        } else {
          Write-TextResponse -Stream $stream -Status 404 -Reason 'Not Found' -Text '404 Not Found'
          continue
        }
      }

      $extension = [System.IO.Path]::GetExtension($candidate).ToLowerInvariant()
      if (-not $mimeTypes.ContainsKey($extension)) {
        Write-TextResponse -Stream $stream -Status 415 -Reason 'Unsupported Media Type' -Text '415 Unsupported Media Type' -HeadOnly $headOnly
        continue
      }

      $body = [System.IO.File]::ReadAllBytes($candidate)
      Write-Response -Stream $stream -Status 200 -Reason 'OK' -ContentType $mimeTypes[$extension] -Body $body -HeadOnly $headOnly
    } catch {
      try {
        if ($null -ne $stream -and $stream.CanWrite) {
          Write-TextResponse -Stream $stream -Status 500 -Reason 'Internal Server Error' -Text '500 Internal Server Error'
        }
      } catch {
      }
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
