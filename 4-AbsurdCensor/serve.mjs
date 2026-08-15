// Static file server for the built `dist` folder (no external deps).
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const port = Number(process.argv[2] || 5188)
const root = path.join(process.cwd(), 'dist')
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0])
  if (urlPath === '/') urlPath = '/index.html'
  let filePath = path.join(root, urlPath)
  if (!filePath.startsWith(root)) {
    res.writeHead(403).end('Forbidden')
    return
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(root, 'index.html'), (e2, html) => {
        if (e2) res.writeHead(404).end('Not found')
        else res.writeHead(200, { 'Content-Type': types['.html'] }).end(html)
      })
      return
    }
    const ext = path.extname(filePath)
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' }).end(data)
  })
})
server.listen(port, '127.0.0.1', () => {
  console.log(`AbsurdCensor preview: http://127.0.0.1:${port}/`)
})
