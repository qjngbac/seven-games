// 游戏大厅统一静态服务器 —— 零外部依赖，仅用 Node 内置模块。
// 用途：在本机或局域网启动后，浏览器打开即进入 7 款小游戏的大厅。
// 为什么零依赖：迁移到别的电脑时，只要目标机装了 Node（>=14）即可运行，
// 不需要 npm install，也不需要原项目的 node_modules。
import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import os from 'node:os'

const PORT = Number(process.env.PORT || 5200)
const ROOT = process.cwd()

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
}

async function tryFile(urlPath) {
  // 防目录穿越：resolve 后必须仍位于 ROOT 内（兼容 %2e%2e%2f、..%5C 等编码变体）。
  // 不能用「剥掉开头的 ../」的方式，正则处理不了反斜杠与嵌套编码。
  if (urlPath.includes('\0')) return null
  const filePath = resolve(ROOT, '.' + urlPath)
  if (filePath !== ROOT && !filePath.startsWith(ROOT + sep)) return null
  let s
  try {
    s = await stat(filePath)
  } catch {
    return null
  }
  if (s.isDirectory()) {
    const idx = resolve(filePath, 'index.html')
    try {
      await stat(idx)
      return idx
    } catch {
      return null
    }
  }
  return filePath
}

const server = http.createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0])
    if (urlPath === '/' || urlPath === '') urlPath = '/index.html'
    const filePath = await tryFile(urlPath)
    if (!filePath) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('404 Not Found: ' + urlPath)
      return
    }
    const data = await readFile(filePath)
    const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream'
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' })
    res.end(data)
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('500 ' + (e && e.message ? e.message : String(e)))
  }
})

function lanIP() {
  const ifs = os.networkInterfaces()
  for (const name of Object.keys(ifs)) {
    for (const ni of ifs[name] || []) {
      if (ni.family === 'IPv4' && !ni.internal) return ni.address
    }
  }
  return null
}

server.listen(PORT, '0.0.0.0', () => {
  const ip = lanIP()
  console.log('\n  🎮 七款小游戏 · 统一大厅已启动')
  console.log('  ────────────────────────────────────')
  console.log('  本机访问 :  http://localhost:' + PORT + '/')
  if (ip) console.log('  手机/局域网: http://' + ip + ':' + PORT + '/   (同一 WiFi 下)')
  console.log('  ────────────────────────────────────')
  console.log('  按 Ctrl+C 停止\n')
})
