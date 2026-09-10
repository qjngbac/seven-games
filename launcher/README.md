# 七款小游戏 · 统一大厅（launcher）

把 1–7 号共七款网页小游戏聚合到一个入口页，一键启动、可整体迁移、手机可访问。

游戏列表（已内置，无需再构建）：

| # | 文件夹 | 标题 | 操作方式 | 手机 |
|---|--------|------|----------|------|
| 1 | `games/absurd-decision/` | 今天也要做决定 | 键盘 | 需桌面模式/外接键盘 |
| 2 | `games/impostor-lies/` | 这里有人在说谎 | 纯点击 | ✅ 可玩 |
| 3 | `games/no-server-boom/` | 今天别把机房炸了 | 纯点击 | ✅ 可玩 |
| 4 | `games/absurd-censor/` | 荒诞审查局 | 键盘 A/S/D（有屏幕按钮） | ⚠ 有屏幕按钮 |
| 5 | `games/who-broke-prod/` | 谁动了生产环境 | 纯点击 | ✅ 可玩·已适配 |
| 6 | `games/shifting-rules/` | 规则正在跑路 | 键盘 | 需桌面模式/外接键盘 |
| 7 | `games/ridiculous-toolbox/` | 离谱工具箱 | 纯点击 | ✅ 可玩 |

## 一、在本机玩（最快）

**Windows**：双击 `start.cmd` —— 会自动打开浏览器到 `http://localhost:5200/`。
**Mac / Linux**：在终端执行 `sh start.sh`。

也可以手动：在本文件夹运行 `node serve.mjs`，再浏览器打开 `http://localhost:5200/`。

## 二、迁移到别的电脑

整个 `launcher` 文件夹是**自包含的**（已包含 7 个游戏的构建产物 `games/*/dist`）：
只需把这一个文件夹复制到目标电脑即可，**不需要原项目、不需要 node_modules**。

目标机启动方式（任选其一）：
- 装了 Node（≥14）：双击 `start.cmd` 或 `sh start.sh`
- 没装 Node：在该文件夹执行 `python3 -m http.server 5200`，浏览器开 `http://localhost:5200/`
- 任意静态服务器 / 网盘 / U 盘 / Nginx / GitHub Pages 均可托管——纯静态文件，无后端

> 换端口：启动前设置环境变量 `PORT=8080 node serve.mjs`（或改 `start.cmd` 里对应行）。
> 开局域网：默认只监听 `127.0.0.1`；需要手机访问时用 `HOST=0.0.0.0 node serve.mjs` 启动。

## 三、手机上玩

1. 电脑上按「一」并以局域网模式启动：`HOST=0.0.0.0 node serve.mjs`（默认只监听 `127.0.0.1`，手机访问不到）。
2. 手机与电脑连**同一个 WiFi**。
3. 手机浏览器打开大厅启动日志里显示的局域网地址，形如 `http://192.168.x.x:5200/`。
4. 纯点击类（2/3/5/7）可直接玩；键盘类（1/4/6）建议在手机浏览器开「桌面版网站」或接蓝牙键盘。

## 四、文件结构

```
launcher/
├── index.html        # 大厅入口页（响应式，含各游戏说明）
├── serve.mjs         # 零依赖 Node 静态服务器（默认监听 127.0.0.1；HOST=0.0.0.0 开后局域网）
├── start.cmd         # Windows 一键启动
├── start.sh          # Mac/Linux 一键启动
├── README.md
└── games/            # 7 个游戏构建产物（base 为相对路径，互不冲突）
    ├── absurd-decision/
    ├── impostor-lies/
    ├── no-server-boom/
    ├── absurd-censor/
    ├── who-broke-prod/
    ├── shifting-rules/
    └── ridiculous-toolbox/
```

## 五、重新生成（给开发者）

若修改了某款游戏源码，在其项目根目录重新 `vite build`，
再把该项目的 `dist/` 内容整体覆盖回 `launcher/games/<对应文件夹>/` 即可。
所有游戏构建时均使用 `base: './'`（相对路径），因此放进子目录也不会路径错乱。
