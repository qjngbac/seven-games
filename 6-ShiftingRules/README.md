# 规则正在跑路（Shifting Rules）

一款「规则变化反应判断」网页小游戏（工作名《规则正在跑路》）。屏幕给出颜色 / 文字 / 数字 / 形状 / 角色组合的刺激，你要按**当前规则**在时限内按对方向。乐趣来自**规则叠加与优先级**，而不是单纯手速——规则还会越加越多、还会「跑路」。

技术栈：**Phaser 3 + TypeScript + Vite + Vitest**。规则层是纯逻辑、可脱离界面单测；UI 用 Phaser 渲染。

## 快速开始

```bash
npm install
npm run dev        # 开发热更，默认 http://localhost:5173
npm run build      # 类型检查 + 生产构建到 dist/
npm run preview    # 预览构建产物 (或 node serve.cjs 5180)
npm test           # 运行规则层 / 生成器 / 会话 / 评分全部单测
npm run typecheck  # 仅类型检查
```

## 玩法

- 输入：键盘 `←` / `A` 左，`→` / `D` 右，`↓` / `空格` 跳过。
- 每轮只有一个正确输入；规则按**优先级**归约（数字越大越晚生效、越能覆盖前面的规则）。
- 例如：`红色按左(10)` + `出现猫规则反转(100)` → 红猫正确按**右**。
- 普通 / 禅 / 每日挑战 / 练习室 四种模式；普通与每日有生命，规则随关卡逐步揭示。

## 架构（与开发文档 §6 对齐）

```
src/
  game/
    rng.ts                 可复现随机数 (mulberry32) —— 固定种子可重放
    rules/                 ★纯逻辑层 (无 Phaser)
      schema.ts            Stimulus / Rule / RuleSet / Action 类型
      evaluator.ts         RuleEvaluator：返回唯一动作 + 命中轨迹
      compiler.ts          简写谓词→规范化 + 同优先级冲突检测
      explainer.ts         把命中轨迹翻译成「为什么错」的讲解
    stimuli/               ★纯逻辑层
      space.ts             刺激空间（颜色/文字/数字/形状/角色）
      generator.ts         受约束生成：只生成唯一可判定的回合
      validator.ts         20000 刺激采样：唯一性 / 冲突 / 可达性校验
    scoring/score.ts       评分：准确率主权重、速度次权重、连击
    modes/                 模式定义 (normal/zen/daily/practice)
    session.ts             ★纯逻辑核心回合循环 (GameSession)
    recorder.ts            回合记录（重放用）
    settings.ts            设置 + 存档（事务式写入 localStorage）
    audio/sfx.ts           WebAudio 合成音效（无音频资源文件）
    input/keymap.ts        键盘→动作 映射
    ui/                     Phaser 渲染（调色板 / 刺激卡 / 按钮控件）
    scenes/                 Boot/Menu/RulePreview/Game/RuleChange/Result/Settings
  data/
    rule-packs/*.json      5 个数据驱动规则包（共 24+ 条规则）
    packs.ts               编译 + 校验所有规则包
```

## 内容：5 个规则包

| 包 | 难度 | 规则数 | 要点 |
|----|----|----|----|
| 基础颜色 | 1 | 3 | 红左 / 蓝右 / 绿跳过 |
| 数字奇偶 | 2 | 4 | + 偶数右 / 奇数左 |
| 角色反转 | 3 | 5 | + 猫反转 / 狗右 / 机器人跳过 |
| 文字陷阱 | 4 | 5 | + 文字写「红」按左 / 写「蓝」按右（Stroop） |
| 极限混战 | 5 | 10 | 上述规则大乱斗 |

所有规则用结构化字段表达（谓词 + 动作 + 优先级 + 展示文本），**文本与执行同源**，加载时做冲突检测，绝不进入有歧义的对局。

## 测试与验证（已全绿）

- `npm test`：**34/34** 通过。
- 规则引擎：文档示例「红猫→右」、INVERT 组合、文字优先 Stroop。
- 校验器：对**每个规则包随机 20000 个刺激**，确认最终动作唯一、无同优先级冲突、无不可达死规则。
- 会话：30 轮全对可完成、连续按错生命耗尽、阶段揭示新规则、固定种子**重放一致**（同种子 + 同输入脚本 → 完全一致的刺激序列与结算）。
- `npm run typecheck` 与 `npm run build` 均通过。

## 可访问性（文档 §5.2 / §7.1）

- 色弱模式：颜色永远配中文标签与辅助形状提示，绝不只靠颜色判断。
- 可关闭屏幕抖动；音效可单独开关；字体大小可调；全程键盘可玩。
- 公平计时：刺激倒计时结束后才可见、才可交互；失焦/暂停时计时冻结。

## 备注

- 构建产物较大（Phaser 约 354 KB gzip），属正常。
- 本地预览服务（serve.cjs）后台运行时，关掉进程即停。
