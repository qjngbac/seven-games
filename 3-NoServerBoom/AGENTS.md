# AGENTS.md — 今天别把机房炸了（3-NoServerBoom）

错误操作模拟器 / 故障诊断游戏。Vue 3 + TS + Vite + Pinia + Vitest。

## 核心架构原则（务必遵守）
- **设备状态是唯一事实来源**。症状由底层状态推导，绝不写死；操作只修改声明的状态。
- 跨设备依赖通过 `WorldView` 读取，缺失设备默认“正常”（向后兼容旧工单）：
  - 交换机 `poeOk` 守卫；摄像头链路依赖 `cableOk`（主干 `cab_trunk` + 本路 `cab_<cam>` + 光纤 `fiber1`）。
  - **供电主干 `backbonePower`**：市电 `pw_main.mainsOk` 正常，或 UPS `ups1.upsOk && batteryOk` 正常 → 整机有电。交换机/服务器/NVR/门禁/AP 的 `powered` 均依赖它。
  - **制冷链**：服务器 `tempHigh = powered && (!fanOk || !acRunning)`；机房空调 `ac1.acOk` 缺失默认正常。
  - **外网链**：服务器 `wanUp = netUp && routerWan(router1.wanUp)`，无线 AP `apUp = powered && apOk && routerWan`；网关 `router1` 缺失默认外网正常。
  - 光纤 `fiber1.fiberOk` 缺失默认正常。
- 依赖变化用固定顺序反复重算直到稳定（`simulation.ts` 的 `recompute` 不动点迭代）。
- 高危不可逆操作（`highRisk: true`）必须由 UI 二次确认后才执行；其 `damage > 0`。

## 模块职责（不要越界）
- `src/game/simulation.ts`：保存设备/组件状态、传播依赖。**不碰 UI**。
- `src/game/symptoms.ts`：从状态生成可观察症状。**不修改状态**。
- `src/game/controller.ts`：FSM + 离散时间步 + 验收 + 结算 + 时间线。**不实现设备细节**。
- `src/data/*`：设备库 / 动作库 / 故障库 / 工单库，全部数据驱动。
- `src/store.ts`：Pinia 包装，用 `version` ref 触发 computed 重算（controller 用 `shallowRef`+`markRaw` 避免代理破坏内部 Map）。

## 数据契约
- `WorkOrder.faults: { fault: string; target?: string }[]` —— 目标类故障在注入时绑定具体设备。
- `FaultDef.resolved?: (w, target?) => boolean` —— 根因是否消除，用于 `rootCauseFixed`。
- `ActionDef.effects` 可为数组或 `(target) => EffectSpec[]`；`requirements?: (w, target?) => boolean`。
- 新增工单必须：① 在 `data/workorders.ts` 提供 `referencePath`；② 让 `controller.spec.ts` 的“每关可解”测试通过。

## 常用命令
- 测试：`node_modules/.bin/vitest run`（或 `npm test`）。
- 类型检查：`node_modules/vue-tsc/bin/vue-tsc.js --noEmit`。
- 构建前先 `rm -rf dist` 再 `vite build`（沙箱 safe-delete 会拦截 emptyDir）。

## 验证状态
- 测试 58/58 通过；vue-tsc 零错误；vite build 成功（~143 KB / gzip 50 KB）。
- 设备类型 17 种、动作 46 个、工单 30 个（6 章）；摄像头每路故障各异；第六章为“一环扣一环”连环故障。
- 预览：`npm run serve` → http://127.0.0.1:5187/
