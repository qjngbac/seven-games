@echo off
chcp 65001 >nul
cd /d %~dp0

REM 检查 node 是否可用
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [错误] 未检测到 Node.js。请先安装 Node.js (https://nodejs.org)，或在已装 Node 的电脑上运行。
  echo 也可改用 Python：在本文件夹执行  python -m http.server 5200
  pause
  exit /b 1
)

echo 正在启动游戏大厅...
start "" http://localhost:5200/
node serve.mjs
