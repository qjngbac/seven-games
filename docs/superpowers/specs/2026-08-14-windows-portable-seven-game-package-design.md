# 七款小游戏 Windows 免运行时便携包设计

**日期：** 2026-08-14  
**状态：** 已确认，待实施  
**目标平台：** Windows 10 / Windows 11

## 1. 目标

把当前七款网页小游戏的最新生产构建整合成一个可发送给他人的 Windows 便携包。接收方解压后双击启动文件即可进入统一游戏大厅，无需安装 Node.js、Python、npm 或项目依赖，也不需要联网。

## 2. 约束

- 保持七款游戏现有玩法、画面、技术栈和存档方式，不修改游戏业务代码。
- 不下载 Electron、Node 运行时或其他大型依赖。
- 不把各项目的 node_modules、源码、测试、开发文档放入交付包。
- 只支持 Windows 10 / 11；使用系统自带 Windows PowerShell 5.1 和 .NET。
- 正式服务只监听 127.0.0.1，不开放局域网访问，避免防火墙提示和非本机访问。
- 交付包同时提供文件夹版和 ZIP，ZIP 解压后直接运行。

## 3. 方案选择

采用“静态大厅 + PowerShell 本地 HTTP 服务”方案。

不采用内置 Node：它会显著增加包体。  
不采用 Electron/WebView2 封装：它需要额外大型依赖，且会改变现有浏览器运行方式。  
不采用直接打开 file://：ES 模块、路由和浏览器安全策略可能导致部分游戏无法加载。

## 4. 交付结构

交付目录固定为 release/Seven-Games-Windows-Portable/：

    Seven-Games-Windows-Portable/
    ├── 开始游戏.cmd
    ├── server.ps1
    ├── README.txt
    ├── index.html
    └── games/
        ├── absurd-decision/
        ├── impostor-lies/
        ├── no-server-boom/
        ├── absurd-censor/
        ├── who-broke-prod/
        ├── shifting-rules/
        └── ridiculous-toolbox/

games/* 仅包含七款游戏各自最新 dist 的内容。统一大厅复用现有 launcher/index.html 的风格和七个入口，但删除旧的 Node/Python、局域网和手机访问说明，改为 Windows 免运行时便携版说明。

## 5. 启动流程

1. 用户双击 开始游戏.cmd。
2. 批处理脚本以当前交付目录为工作目录，调用 powershell.exe -NoProfile -ExecutionPolicy Bypass -File server.ps1。
3. server.ps1 在 127.0.0.1:5200 启动基于 .NET TcpListener 的静态服务器。
4. 服务就绪后自动用默认浏览器打开 http://127.0.0.1:5200/。
5. 命令窗口保持打开并显示停止方法；用户关闭窗口或按 Ctrl+C 后服务结束。

固定使用 5200 端口，以保持浏览器 localStorage 的来源稳定，避免因端口变化造成存档看似丢失。

## 6. 静态服务行为

- / 返回统一大厅 index.html。
- 游戏目录请求返回对应文件；目录请求自动寻找 index.html。
- 支持 HTML、JavaScript、CSS、JSON、SVG、PNG、JPEG、GIF、ICO、字体和 source map MIME 类型。
- 对不存在的游戏内部路径回退到该游戏目录的 index.html，兼容单页应用。
- 拒绝路径穿越；解析后的文件必须位于交付根目录内。
- 静态响应设置 Cache-Control: no-cache，避免升级包后浏览器继续使用旧资源。
- 提供只读健康检查 /__health，返回 HTTP 200 和固定文本。

## 7. 错误处理

- PowerShell 不可用：批处理脚本显示中文错误并暂停，不静默退出。
- 5200 端口被占用：显示“端口已占用”，提示关闭旧游戏窗口后重试；不自动改端口。
- 文件缺失或 MIME 不支持：返回明确的 404/415，不泄露本机绝对路径。
- 浏览器无法自动打开：服务仍保持运行，并在窗口显示可手动复制的本机地址。
- 服务器异常：显示简短中文错误，退出码非零。

## 8. 构建与同步

1. 对七款项目运行完整测试、类型检查和 Vite 生产构建。
2. 根据固定映射把各自 dist 内容同步到交付包的 games/<slug>/。
3. 第 2 款必须包含最新第 8 章四关以及首页 32 关统计。
4. 同步时只操作新建的精确交付目录，不修改七款源码和现有 node_modules。
5. 生成 ZIP：release/Seven-Games-Windows-Portable-2026-08-14.zip。

## 9. 验证

自动检查：

- 交付包中不存在 node_modules、.ts、测试文件或源码目录。
- 七个游戏入口及其 HTML/JS/CSS 主资源均返回 HTTP 200。
- 路径穿越请求被拒绝。
- 健康检查返回 HTTP 200。
- ZIP 可正常解压，解压后的目录结构与文件夹版一致。

实际冒烟检查：

- 从交付目录运行 开始游戏.cmd，不使用项目 Node/Python。
- 统一大厅显示七张游戏卡片。
- 逐一打开七款游戏，确认首屏渲染且浏览器控制台没有错误。
- 第 2 款显示 32 关，并能进入第 8 章。
- 停止服务后确认 5200 端口不再监听。

## 10. 非目标

- 不生成安装程序、注册表项、桌面快捷方式或卸载程序。
- 不提供自动更新、联网账号、云存档或局域网手机访问。
- 不把七款游戏改造成原生 Windows 窗口程序。
- 不做代码签名；首次运行批处理文件时可能受目标电脑自身安全策略影响。

## 11. 验收标准

- Windows 10 / 11 用户在没有 Node.js 和 Python 的情况下，解压 ZIP 后双击 开始游戏.cmd 能进入大厅。
- 七款游戏均从统一大厅正常启动。
- 交付包完全离线运行，包内不包含大型开发依赖。
- 原七款游戏源码、玩法、画面和工具链不因打包发生改变。
