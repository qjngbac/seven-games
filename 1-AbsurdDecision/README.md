# 今天也要做决定

搞笑叙事选择 + 轻度数值管理的网页小游戏。你是普通打工人，每天处理若干荒诞事件；每个选择改变 **金钱 / 声誉 / 精神 / 技术债**，并可能埋下标签或预约未来的「后续事件」。撑过规定天数即通关；任一核心资源越界即触发对应失败结局。

> 类型：叙事选择 + 数值管理 · 单局 8–15 分钟 · 纯前端、无服务端、无登录。

## 运行

```bash
npm install
npm run dev        # 本地开发，默认 http://localhost:5173
npm run build      # 类型检查 + 生产构建到 dist/
npm run preview    # 预览构建产物
npm run test       # 单元测试（Vitest，覆盖 core 规则层）
npm run typecheck  # 仅类型检查
```

## 技术栈

Vue 3 + TypeScript + Vite + Pinia + Vitest。规则层（`src/core`）完全不依赖 DOM，可单测、可复用、可重放。

## 目录结构

```
src/
  core/        # 纯规则（无 DOM）：rng / state / resources / effects / eventSelector / game / types
  data/        # 内容配置：world.ts（资源/关系/特质）+ events/*.json（事件包）+ schema.ts（校验）
  stores/      # Pinia 状态机（唯一业务状态所有者）
  services/    # save（存档/版本/迁移）、audio（合成音效）
  components/   # 展示组件（按 screen 切换）
  tests/        # 规约测试（见各 *.spec.ts，实际位于 src/core 旁）
```

## 数据 Schema（事件）

事件以 JSON 存放，程序只解释规则：

```jsonc
{
  "id": "camera_offline_001",        // 全局唯一
  "category": "repair",
  "weight": 10,                       // 基础权重
  "priority": 1.5,                    // 可选：剧情优先级倍率
  "conditions": {                     // 可选出现条件
    "dayMin": 1, "dayMax": 6,
    "requiredTags": [], "forbiddenTags": [],
    "resourceRange": { "techDebt": [0, 90] },
    "weekdays": [1,2,3,4,5]
  },
  "title": "摄像头突然离线",
  "body": "客户强调昨天还好好的……",
  "clues": ["客户：昨天还好好的"],     // 玩家可见线索
  "choices": [
    {
      "id": "check_cable",
      "text": "先检查供电和网线",
      "effects": [                      // 即时效果
        { "type": "resource", "target": "reputation", "value": 2 },
        { "type": "tag", "target": "found_loose_cable", "value": true }
      ],
      "resultText": "网线松了……",
      "delayed": {                      // 可选延迟效果
        "daysLater": 2,
        "effects": [{ "type": "resource", "target": "reputation", "value": -2 }],
        "note": "摄像头又离线了"
      },
      "requires": { "requiredTags": [] }, // 可选前置条件（不满足则选项禁用）
      "hidden": "网线松动是真实原因"      // 仅内容自检用
    }
  ],
  "meta": { "testsJudgment": true, "funny": "…", "hook": "…" }
}
```

效果类型：`resource`（金钱/声誉/精神/技术债）、`tag`（增/移除标签）、`relation`（角色关系）、`schedule`（预约未来事件）、`unlock`（解锁内容）。数值范围建议 -3..+3。

## 事件链（标签驱动）

事件之间用**标签**而不是硬编码分支连接，例如：
- `password_postit_001` 选择贴便签 → 加 `insecure_password` → `security_audit_002`（出现条件 `requiredTags:["insecure_password"]`）随之解锁。
- `server_fan_001` → 加 `fan_note_found` → `server_room_smell_002`。
- `camera_offline_001` → 加 `found_loose_cable` → `camera_revisit_002`。
- `boss_meeting_001` 改变老板好感 → `boss_review_002`（dayMin 2）承接。

当前内置 **65 个事件（5 个内容包）、10 条标签事件链**，均通过 `schema.ts` 校验，无非法内容。

- `pack1.json` ~ `pack3.json`：IT 办公与职场荒诞事件（服务器、代码审计、老板会议、监控摄像头等）。
- `pack4.json`：**资源危机专属事件**，只在特定资源区间出现（`conditions.resourceRange`），
  例如「技术债 ≥ 70」「精神 ≤ 25」「金钱 ≤ 20」「声誉 ≤ 25」以及复合条件「技术债 ≥ 50 且精神 ≤ 35」。
  这些事件里还使用了**选项前置**（`requires`），例如「找老板谈涨薪」只有先建立过沟通（持有 `boss_meeting_done`）才可选。
- `pack5.json`：**生活、通勤、家庭、租房、社交与摸鱼奇遇大礼包**（24 个全新原创事件）。
  覆盖领域：
  - **早晚通勤**：早高峰挤地铁、共享单车开盲盒、暴雨天水坑信仰之跃、网约车哲学家司机、拼车拼到同组死对头；
  - **家庭亲戚**：家族相亲相爱群养生假新闻辟谣、熊孩子借电脑玩游戏、老妈安排的硬核相亲、表哥借钱搞元宇宙养鸡；
  - **租房邻里**：房东阿姨突然加租八百、楼上邻居半夜打保龄球、单元门口碰瓷翻肚皮的橘猫、猫猫爪踩键盘发版奇迹；
  - **人情社交**：疯狂星期四炸鸡狂欢、凌晨一点路边炭烤生蚝与啤酒、健身房肌肉教练前后夹击推销；
  - **摸鱼解压与身心健康**：工位赛博木鱼积攒功德、抽卡手游限定池终局倒计时、闲鱼出闲置遭遇宇宙级大刀客、摸鱼开源项目收到奇葩 Issue、年度体检报告开箱惊魂。
- **精神恢复与选择多样性**：新事件大幅增加了 3~4 个维度的选择，提供了超 70 个可以增加**精神（+2 至 +6）**的幽默、解压选项（如发疯文学、深夜碳水疗愈、工位吸猫、赛博木鱼、机智回怼、反向化缘等），使游戏资源平衡与玩法策略更加丰富！

## 界面与主菜单导航

- **常驻主菜单入口**：应用顶栏全局常驻「🏠 主菜单」按钮与天数标识（点击品牌标题亦可返回），随时支持保存当前对局并安全退回主菜单。
- **设置页状态流**：设置页区分「返回游戏」（保持当前事件/页面）与「保存并回主菜单」，解决此前无法在局内自由切换界面的问题。
- **日结与事件页暂存**：日结页提供「保存并回主菜单」，事件页提供快捷暂存链接，所有退出均走事务持久化，主菜单「继续」随时无缝恢复。
- **走势折线图**：日结页（Day Summary）用 `state.history` 绘制**资源走势折线**：四条资源各自按自身 `[min, max]`
  归一化后同框对比，尾部带端点标记与图例，可以直观看出「这一周钱、声誉、精神、技术债各自在往哪走」。

## 存档

localStorage，键 `absurd-decision:save`，含 `version` 字段。写入先写临时键再覆盖主键（事务式），覆盖前备份旧值；读取损坏时回退备份。旧版本可通过 `migrate()` 扩展迁移。

## 测试与验收

- RNG 可复现：同 seed 同选择 → 同事件同结算。
- 效果事务：非法效果回滚，不残写；`appliedTags` 真实反映本次标签效果。
- 事件抽取：条件过滤 + 带权 + 最近事件冷却 + 类别疲劳；保证抽到的事件至少有一个可选选项（无死锁）。
- 资源危机事件：`resourceRange` 区间外不可抽到、区间内可抽到；`requires` 前置不满足时选项禁用但事件不死锁。
- 结局：资源越界只触发一次；撑过天数即通关。
- 内容：schema 校验，非法事件跳过并记日志，不崩溃；`CONTENT_ERRORS` 必须为空。
- 存档：首日快照包含开局特质；同一天不会产生两条重复快照（资源曲线数据可直接绘制）。

## 设计文档对应

实现严格对照 `documents/01_荒诞情境判断游戏_开发文档.docx`（即设计文档 §8 的开发合同）：纵向切片（菜单→新游戏→事件→日结→结局）、数据驱动、DOM-free 规则层、可复现随机、存档版本、单元测试、内容批量与校验。
