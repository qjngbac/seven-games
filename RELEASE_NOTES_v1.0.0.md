# 七款小游戏 Windows 便携版 v1.0.0

这是七款小游戏合集的首个公开稳定版本。

源码仓库：[qjngbac/seven-games](https://github.com/qjngbac/seven-games)

## 包含的游戏

1. 荒诞情境判断游戏
2. 伪装者逻辑推理游戏
3. 错误操作模拟器
4. 有限信息审查游戏
5. 多人对话推理游戏
6. 规则变化反应判断游戏
7. 物品组合解谜游戏

## 玩家环境要求

- Windows 10 或 Windows 11
- 现代网页浏览器
- 不需要安装 Node.js 或 Python
- 下载完成后不需要联网

## 运行方法

1. 在下方附件区域下载 **`Games.zip`**。
2. 完整解压 ZIP，不要直接从压缩包预览中运行。
3. 打开 `Seven-Games-Windows-Portable` 文件夹。
4. 双击 `开始游戏.cmd`。
5. 游戏期间保持启动窗口开启。

启动器只通过 `http://127.0.0.1:5200/` 提供本地游戏服务。游戏进度和设置保存在
当前浏览器的本地存储中。

GitHub 自动生成的 **`Source code (zip)`** 不是可直接运行的游戏包。玩家应下载
Release 附件中的 `Games.zip`。

## 完整性校验

本版本同时提供 `SHA256SUMS.txt`。

```text
4C310B56197F518B29CF389F19936D41BB65B68265B9308F46F87AFB35B68083 *Games.zip
```

PowerShell 校验命令：

```powershell
$expected = ((Get-Content .\SHA256SUMS.txt -Raw).Trim() -split '\s+')[0]
$actual = (Get-FileHash -Algorithm SHA256 .\Games.zip).Hash
if ($actual -ne $expected) { throw 'Games.zip 校验值不匹配' }
"SHA-256 校验通过：$actual"
```

## 许可证

源码采用 GNU 通用公共许可证第 3 版（`GPL-3.0-only`）发布。
