# AGENTS.md — 谁动了生产环境

面向 AI 编程 Agent 的项目约定。先理解产品，再改代码。

## 产品本质

这是一款**对话侦探 / 证据推理**游戏。案件首先是一张**客观真相图**（TruthGraph）；角色回答只是各自有限视角，不代表作者旁白。玩家的任务是把证词和证据还原为事件链，最终提交结构化指控。

**铁律（违反即破坏推理公平性）：**
- 新增对白前必须说明它对应什么事实、角色为何知道、是否真实、解锁什么。
- 角色**不能说出自己不可能知道的信息**（严格维护 KnowledgeState）。
- 关键证据（日志、记录）必须可直接检视，不能因提问顺序被永久错过。
- 指控校验用结构化事实/证据集，**禁止字符串关键词匹配**。

## 架构边界（模块职责，见开发文档 §6.3）

| 模块 | 职责 | 禁止 |
|------|------|------|
| `case-model/truth-graph.ts` | 保存客观真相与案件 schema | 不根据玩家行为改写真相 |
| `dialogue/response-selector.ts` | 选当前可用回答与解锁 | 不验证最终指控 |
| `case-model/knowledge.ts` | 角色所知/所信/意图 | 不负责 UI 文案排版 |
| `evidence/board.ts` | 玩家连接与笔记 | 不自动改变案件事实 |
| `case-model/claim-validator.ts` | 把提交映射到验收条件 | 不展示角色对白 |
| `store.ts` | 行动点/解锁/剧情状态/存档 | 不实现推理算法 |

## 关键算法（文档 §6.4）

- 回答选择：`candidates = responses.filter(conditionsMatch); return maxBy(candidates, priority)`。
- 矛盾检测：把证词转为结构化事实，检测同一主体/时间/属性上的互斥值（案件用 `contradictions` 显式定义）。
- 指控匹配：验收条件要求事实集 + 证据集 + 禁止矛盾，允许多个等价表述（`actionAliases`）。

## 内容新增流程（里程碑 M4）

1. 先写**案件圣经**：真相时间线 → 角色知识边界 → 证据路径（逻辑闭合）。
2. 在 `src/data/cases/` 新增 `caseN-*.ts`，导出 `CaseDef`，并在 `index.ts` 的 `CASES` 数组追加。
3. 必填校验（由 `content.spec.ts` 自动覆盖，漏填会测试失败）：
   - 每个 `truthEvents.facts` 中的事实都要有证据或证词路径。
   - 每个话题至少有一个**无条件兜底回答**。
   - `acceptance.requiredFacts` 必须可由"仅检视证据"获得（防永久锁死）。
   - 矛盾对引用的都是真实事实。
4. 运行 `npm test`、`npm run typecheck`、`npm run build` 全绿后再提交。

## 验证命令

```bash
npm test            # 87 项：claim-validator(9) + response-selector(6) + content(72，7 个案件 × 10 断言 + 索引)
npm run typecheck  # vue-tsc 零错误
npm run build      # vite build 成功
```

## 复用说明

`node_modules` 从同系列 `4-AbsurdCensor` 复制（Vue3+TS+Vite+Pinia+Vitest 同版本）。预览用管理 node 二进制运行 `node serve.mjs 5189`。
