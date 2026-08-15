// 静态文件预览服务器（端口 5189）。后台运行即可在浏览器访问。
// 用法：node serve.mjs [port]
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const root = process.cwd()
const port = Number(process.argv[2] || process.env.PORT || 5189)
const distDir = join(root, 'dist')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2'
}

const server = createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0])
    if (urlPath.endsWith('/')) urlPath += 'index.html'
    const filePath = normalize(join(distDir, urlPath))
    if (!filePath.startsWith(distDir)) {
      res.writeHead(403)
      res.end('Forbidden')
      return
    }
    let target = filePath
    try {
      const s = await stat(target)
      if (s.isDirectory()) target = join(target, 'index.html')
    } catch {
      // SPA fallback: 未知路径回退到 index.html
      target = join(distDir, 'index.html')
    }
    const data = await readFile(target)
    const mime = MIME[extname(target)] || 'application/octet-stream'
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' })
    res.end(data)
  } catch (e) {
    res.writeHead(500)
    res.end('Server error: ' + String(e))
  }
})

server.listen(port, () => {
  console.log(`[serve] WhoBrokeProd preview → http://127.0.0.1:${port}/`)
})
