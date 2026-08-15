# 多人对话推理游戏案件扩展实施计划

> **供自动化执行者使用：** 必须使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐项实施本计划。步骤使用复选框（`- [ ]`）跟踪。

**目标：** 新增两个逻辑闭合的调查案件，它们拥有不同的事故结构、证据路径、矛盾点与分散的责任归属。

**架构：** 每个案件都是一个自包含的 `CaseDef`，从一张客观真相图出发，由该图推导出证据、角色知识、对话与验收标准。在两个案件都登记进现有案件索引，使通用内容测试能自动校验可达性与可完成性。

**技术栈：** Vue 3、TypeScript、Pinia、Vitest、数据驱动的 `CaseDef` 模型。

## 全局约束

- 逐字节保留案件 1–7 不变。
- 以新文件形式新增案件 8 `cert-expiry` 与案件 9 `backup-yesterday`。
- 每个必需事实都必须出现在可直接检查的证据中；每个话题都必须有一条无条件兜底回应。
- 角色对话只有在 `CharacterKnowledge` 记录支持该意图时，才能表达谎言、错误或秘密。
- 不初始化 Git，也不安装依赖。

---

### 任务 1：先让九案契约失败

**文件：**
- 修改：`D:\games\5-WhoBrokeProd\src\data\content.spec.ts`
- 测试：`D:\games\5-WhoBrokeProd\src\data\content.spec.ts`

**接口：**
- 输入：`CASES`、`caseById`、通用调查模拟器、`TruthGraph` 与 `validateClaim`。
- 输出：针对第 8、9 章的精确数量与身份断言。

- [ ] **步骤 1：更新计数测试与套件描述**

把套件描述改为 `内容完整性：9 个案件均逻辑闭合且可解`，并把计数测试改为：

```ts
it('共 9 个案件，按章节排序', () => {
  expect(CASES.length).toBe(9)
  expect(CASES.map((c) => c.chapter)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
})
```

- [ ] **步骤 2：扩展索引查找测试**

```ts
expect(caseById('cert-expiry')?.chapter).toBe(8)
expect(caseById('backup-yesterday')?.chapter).toBe(9)
```

- [ ] **步骤 3：运行定向测试并验证 RED**

```powershell
& 'C:\Users\Aeromantic\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\node_modules\vitest\vitest.mjs run src/data/content.spec.ts
```

预期：计数/章节与查找断言失败，因为当前只有七个案件。

### 任务 2：实现案件 8 ——午夜证书过期

**文件：**
- 创建：`D:\games\5-WhoBrokeProd\src\data\cases\case8-cert-expiry.ts`
- 测试：`D:\games\5-WhoBrokeProd\src\data\content.spec.ts`

**接口：**
- 输入：来自 `../../case-model/types` 的 `CaseDef`。
- 输出：`export const case8: CaseDef`，ID 为 `cert-expiry`，章节为 8。

- [ ] **步骤 1：编写真相图与角色边界**

使用以下精确的演员 ID：

```ts
characters: [
  { id: 'lin', name: '林珊', role: '平台工程师', avatar: '🔐', blurb: '关闭了自动续期，打算手工换证书。' },
  { id: 'zhao', name: '赵主管', role: '技术主管', avatar: '👔', blurb: '批准静音证书告警，未要求变更评审。' },
  { id: 'han', name: '韩菲', role: 'SRE', avatar: '📟', blurb: '凌晨看到 TLS 错误，却没有提前收到告警。' },
  { id: 'zhou', name: '周然', role: '后端负责人', avatar: '🧑‍💻', blurb: '服务本身正常，但所有入口握手失败。' },
]
```

真相事件必须按顺序确立：赵批准把重复的证书告警静音；林在 22:15 关闭自动续期却没有经过评审的替代方案；证书在 00:00 过期；告警仍被静音时 TLS 握手失败；韩在 00:18 从用户流量中发现故障。

使用规范事实 ID：

```ts
[
  'alert_muted', 'zhao_approved_silence', 'no_change_review',
  'lin_disabled_renewal', 'auto_renew_disabled', 'manual_replacement_missing',
  'cert_expired', 'tls_failed', 'service_process_healthy', 'outage_detected_late',
  'lin_claimed_renewal_active', 'alerts_claimed_working',
]
```

- [ ] **步骤 2：新增可直接检查的证据**

创建以下证据记录：

```ts
{ id: 'ev_cert_audit', name: '证书审计记录', source: '证书平台', reliability: 1,
  facts: ['auto_renew_disabled', 'cert_expired', 'tls_failed'],
  desc: '自动续期在 22:15 被关闭；证书于 00:00 过期，随后 TLS 握手连续失败。' }
{ id: 'ev_change_log', name: '续期配置变更日志', source: '配置审计', reliability: 1,
  facts: ['lin_disabled_renewal', 'manual_replacement_missing', 'no_change_review'],
  desc: '林珊关闭续期任务，未提交替代证书，也没有对应评审单。' }
{ id: 'ev_alert_config', name: '告警静音配置', source: '监控平台', reliability: 1,
  facts: ['alert_muted', 'zhao_approved_silence', 'outage_detected_late'],
  desc: '证书到期告警被静音至次日 09:00，批准人为赵主管。' }
{ id: 'ev_service_health', name: '服务健康检查', source: '运行监控', reliability: 1,
  facts: ['service_process_healthy', 'tls_failed'],
  desc: '进程与数据库均正常，失败集中在入口 TLS 握手。' }
```

- [ ] **步骤 3：新增知识、话题、矛盾与验收**

林有 `secret` 意图，在出示 `ev_change_log` 之前一直隐瞒 `lin_disabled_renewal`；赵有 `misunderstand` 意图，认为静音噪音不会抑制过期风险；韩与周诚实。给每个角色至少两个话题，每个话题都带一条无条件回应。为林和赵新增证据条件触发的优先回应。

使用矛盾：

```ts
contradictions: [
  ['lin_claimed_renewal_active', 'auto_renew_disabled'],
  ['alerts_claimed_working', 'alert_muted'],
]
```

使用验收：

```ts
acceptance: {
  responsible: ['lin'],
  contributory: ['zhao'],
  action: 'disable_auto_renewal',
  actionAliases: ['关闭自动续期', '停用证书续期', '手工换证未完成', '关闭续期任务'],
  requiredEvidence: ['ev_cert_audit', 'ev_change_log', 'ev_alert_config'],
  minEvidence: 3,
  requiredFacts: ['auto_renew_disabled', 'cert_expired', 'alert_muted'],
  timeWindowMin: 60,
}
```

成功结局必须把林的直接改动与赵的管理责任分开点名；部分结局必须覆盖“识别出林、却遗漏了静音告警责任”的情况。

- [ ] **步骤 4：仅临时导入案件 8 并运行定向测试**

在索引中登记案件 8。预期：案件 8 的通用测试通过，但因案件 9 缺失，全局计数仍为 8 的红色状态。

### 任务 3：实现案件 9 ——恢复到昨天

**文件：**
- 创建：`D:\games\5-WhoBrokeProd\src\data\cases\case9-backup-yesterday.ts`
- 修改：`D:\games\5-WhoBrokeProd\src\data\cases\index.ts`
- 测试：`D:\games\5-WhoBrokeProd\src\data\content.spec.ts`

**接口：**
- 输出：`export const case9: CaseDef`，ID 为 `backup-yesterday`，章节为 9，且在案件 8 之后登记进索引。

- [ ] **步骤 1：编写真相图与演员**

使用演员 ID `gao`（运维工程师，直接责任）、`qian`（DBA 审批人，连带责任）、`mei`（数据分析师，诚实证人）、`sun`（SRE，诚实观察者）。

真相事件必须确立：钱批准了一次未经演练的紧急恢复；高在已有更新有效快照的情况下，于 22:40 选择了前一天的快照；高把数据恢复进生产环境而非临时目标；当日数据行被覆盖；梅在 23:05 发现回退了一天。

使用规范事实：

```ts
[
  'backup_unverified', 'qian_approved_without_drill', 'restore_target_unchecked',
  'gao_selected_old_snapshot', 'newer_snapshot_available', 'wrong_snapshot_restored',
  'production_overwritten', 'today_data_missing', 'rollback_detected',
  'gao_claimed_latest_snapshot', 'qian_claimed_restore_tested',
]
```

- [ ] **步骤 2：新增证据与对话路径**

必需的证据记录为：

```ts
{ id: 'ev_restore_log', name: '数据库恢复日志', source: '数据库审计', reliability: 1,
  facts: ['gao_selected_old_snapshot', 'wrong_snapshot_restored', 'production_overwritten'],
  desc: '高工在 22:40 将昨日快照直接恢复到生产库。' }
{ id: 'ev_backup_catalog', name: '备份快照目录', source: '备份平台', reliability: 1,
  facts: ['newer_snapshot_available', 'gao_selected_old_snapshot'],
  desc: '恢复时已有当日 21:55 的可用快照，但被选中的是昨日快照。' }
{ id: 'ev_approval_ticket', name: '紧急恢复审批单', source: '工单系统', reliability: 1,
  facts: ['backup_unverified', 'qian_approved_without_drill', 'restore_target_unchecked'],
  desc: '钱 DBA 批准直接恢复，演练与目标复核两栏为空。' }
{ id: 'ev_data_diff', name: '数据差异报告', source: '分析平台', reliability: 1,
  facts: ['today_data_missing', 'rollback_detected', 'production_overwritten'],
  desc: '当日新增记录全部消失，数据版本回到前一天。' }
```

给高新增“撤回 `gao_claimed_latest_snapshot`”的证据条件对话，给钱新增“撤回 `qian_claimed_restore_tested`”的证据条件对话。每个话题都保留一条无条件兜底。

- [ ] **步骤 3：新增矛盾与验收**

```ts
contradictions: [
  ['gao_claimed_latest_snapshot', 'gao_selected_old_snapshot'],
  ['qian_claimed_restore_tested', 'backup_unverified'],
]

acceptance: {
  responsible: ['gao'],
  contributory: ['qian'],
  action: 'restore_wrong_snapshot',
  actionAliases: ['恢复了错误快照', '把昨天备份恢复到生产', '选错备份并覆盖生产', '错误数据库恢复'],
  requiredEvidence: ['ev_restore_log', 'ev_backup_catalog', 'ev_approval_ticket'],
  minEvidence: 3,
  requiredFacts: ['wrong_snapshot_restored', 'production_overwritten', 'backup_unverified'],
  timeWindowMin: 60,
}
```

- [ ] **步骤 4：按章节顺序登记两个新案件**

为 `case8` 和 `case9` 添加导入，然后设置：

```ts
export const CASES: CaseDef[] = [case1, case2, case3, case4, case5, case6, case7, case8, case9]
  .sort((a, b) => a.chapter - b.chapter)
```

- [ ] **步骤 5：运行定向测试并验证 GREEN**

预期：92 个内容测试通过；两个案件的事实均可达、均有兜底回应、均可发现矛盾、均有可直接检查的必需事实，且都存在一条可完成指认的成功路径。

### 任务 4：文档与完整验证

**文件：**
- 修改：`D:\games\5-WhoBrokeProd\README.md`

- [ ] **步骤 1：更新案件列表与计数**

把“7 个案件”改为“9 个案件”，新增第 8、9 章两行并附上两条真相摘要，把 `src/data/cases` 的描述改为 9 个案件，并把预期自动测试总数从 87 改为 107（若全新测试输出确认了该精确数字）。

- [ ] **步骤 2：运行第 5 款游戏的全部检查**

```powershell
& 'C:\Users\Aeromantic\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\node_modules\vitest\vitest.mjs run
& 'C:\Users\Aeromantic\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\node_modules\vue-tsc\bin\vue-tsc.js --noEmit
& 'C:\Users\Aeromantic\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\node_modules\vite\bin\vite.js build
```

预期：至少 107 个测试、0 失败，类型检查退出码 0，构建退出码 0。

- [ ] **步骤 3：条件性提交/检查点**

运行 `git -C D:\games rev-parse --is-inside-work-tree`。若如预期失败，跳过提交且不初始化 Git。若之后有了 Git，使用 `feat(who-broke-prod): add certificate and restore cases`。
