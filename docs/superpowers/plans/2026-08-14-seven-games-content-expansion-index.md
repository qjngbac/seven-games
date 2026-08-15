# 七款小游戏内容扩展实施计划

> **供自动化执行者使用：** 必须使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐项实施本计划。步骤使用复选框（`- [ ]`）跟踪。

**目标：** 为五款相互独立的游戏扩充经过验证、互不重复的内容，同时保留每一款现有游戏、工具、视觉风格与架构边界。

**架构：** 把每款游戏当作独立的交付单元，各自拥有红-绿测试循环与验证关卡。由于共享工作区没有 Git 安全网，请按顺序执行五个子计划；在编辑下一款游戏之前，先完成并验证一款游戏。

**技术栈：** Vue 3、TypeScript、Vite、Pinia、Vitest；第 6 款使用 Phaser 3；内容以 JSON/TypeScript 数据驱动。

## 全局约束

- 不初始化 Git、不安装依赖、不下载第三方包，也不修改 `D:\games` 之外的任何文件。
- 不删除或覆盖已有内容；仅追加新的 ID，唯一例外是用生成内容替换已确认为空的 `2-ImpostorLies/src/data/puzzles/ch8.json`。
- 不更改运行时框架、视觉系统或核心玩法。
- 使用已有的 `node_modules` 以及随附的 Node 可执行文件 `C:\Users\Aeromantic\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`。
- 打包工作推迟，不在本计划范围内。
- 由于 `D:\games` 不是 Git 仓库，每一步提交都是条件性的：运行 `git -C D:\games rev-parse --is-inside-work-tree`；若如预期失败，则跳过提交且不初始化 Git。

---

## 执行顺序

1. [第 1 款游戏：16 个新事件](./2026-08-14-game1-absurd-decision-content.md)
2. [第 2 款游戏：恢复第 8 章](./2026-08-14-game2-impostor-lies-chapter8.md)
3. [第 5 款游戏：两个新调查案件](./2026-08-14-game5-who-broke-prod-cases.md)
4. [第 6 款游戏：完整值班规则包](./2026-08-14-game6-shifting-rules-pack.md)
5. [第 7 款游戏：含四关的第 5 章](./2026-08-14-game7-ridiculous-toolbox-chapter5.md)

五个子计划全部通过后，运行第 7 款游戏计划最终任务中的跨项目验证矩阵。在本内容阶段不要重建或更新 `launcher`。
