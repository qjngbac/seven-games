#!/bin/sh
# 启动脚本（Mac / Linux）
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "[错误] 未检测到 Node.js。请先安装 Node.js，或改用 Python："
  echo "  python3 -m http.server 5200"
  exit 1
fi

# 尝试自动打开浏览器
(sleep 1; open http://localhost:5200/ 2>/dev/null || xdg-open http://localhost:5200/ 2>/dev/null) &

exec node serve.mjs
