<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGame } from '../game/store';
import { ITEM_DEFS, TAG_LABELS } from '../data/items';
import type { ItemInstance } from '../logic/schema';

const g = useGame();
const inspected = ref<string | null>(null);

const STATE_KEY_LABELS: Record<string, string> = {
  temp: '温度',
  intakeBlocked: '进风口堵塞',
  coolingActive: '散热运转',
  damaged: '硬件损坏',
  catBlocked: '猫咪阻挡',
  powered: '通电状态',
  leak: '漏水状态',
  fixed: '彻底修复',
  jammed: '机械卡阻',
  open: '开启状态',
  opened: '开启状态',
  closed: '关闭状态',
  lit: '照明发光',
  wired: '线路接通',
  taped: '胶带固定',
  duct: '风道成型',
  patched: '补丁加固',
  shielded: '装配防护',
  water_flowing: '水流状态',
  dead: '电量耗尽',
  wrapped: '绝缘包裹',
  tightened: '牢固旋紧',
  dripping: '滴水渗漏',
  locked: '上锁状态',
  roped: '绳索捆绑',
  lamp: '灯具状态',
  on: '开启运转',
  glued: '胶水粘合',
  flat: '扁平漏气',
  inflated: '充气饱满',
  silenced: '噪音消除',
  ringing: '报警鸣响',
  broken: '破损状态',
  stuck: '卡滞受阻',
  dry: '干燥状态',
  wet: '潮湿状态',
  charged: '完成充能',
  method: '解决途径',
  flushed: '冲刷疏通',
  clogged: '管道堵塞',
  full: '容器满载',
  overflow: '液体溢出',
  sealed: '密封紧实',
  leaking: '持续泄漏',
  smelly: '异味残留',
  free: '解除阻碍',
  rusty: '严重锈蚀',
  loose: '部件松动',
  stripped: '螺丝滑丝',
  burned: '烧焦烧损'
};

const STATE_VAL_LABELS: Record<string, string> = {
  high: '过高',
  medium: '适中',
  low: '正常',
  safe: '安全',
  true: '是',
  false: '否',
  charger: '充电器连接',
  battery: '电池供电',
  on: '开启',
  off: '关闭'
};

function formatStatePair(k: string, v: unknown): string {
  const label = STATE_KEY_LABELS[k] ?? k;
  const valStr = String(v);
  let valDisplay = STATE_VAL_LABELS[valStr];
  if (!valDisplay) {
    if (v === true) valDisplay = '是';
    else if (v === false) valDisplay = '否';
    else valDisplay = valStr;
  }
  return `${label}: ${valDisplay}`;
}

function iconOf(inst: ItemInstance): string {
  return ITEM_DEFS[inst.defId].icon;
}
function nameOf(inst: ItemInstance): string {
  return inst.name ?? ITEM_DEFS[inst.defId].name;
}
function tagsOf(inst: ItemInstance): string[] {
  return ITEM_DEFS[inst.defId].tags;
}
function stateText(s: Record<string, unknown>): string {
  return Object.entries(s)
    .map(([k, v]) => formatStatePair(k, v))
    .join('，');
}
const inspectedItem = computed(() => g.inventory.find((i) => i.instanceId === inspected.value) ?? null);

function clickTarget(targetId: string): void {
  if (g.selected.length === 1) {
    g.useOn(g.selected[0], targetId);
  } else if (g.selected.length === 0) {
    g.lastResult = { ok: false, kind: 'no-recipe', feedback: '先选中一个背包物品，再点场景热点使用它。', produced: [], consumed: [], sceneChanges: [], flagChanges: [] };
  } else {
    g.lastResult = { ok: false, kind: 'no-recipe', feedback: '使用物品时只应选 1 件；要组合就点「组合」按钮。', produced: [], consumed: [], sceneChanges: [], flagChanges: [] };
  }
}
function doCombine(): void {
  if (g.selected.length >= 2) g.combine([...g.selected]);
}
function closeFeedback(): void {
  g.dismissResult();
}

function goLobby(): void {
  window.location.href = '../../index.html';
}
</script>

<template>
  <div class="row spread">
    <div class="row" style="gap: 8px">
      <button class="btn-ghost" @click="g.goLevelSelect()">← 关卡</button>
      <button class="btn-ghost" @click="g.goMenu()">≡ 菜单</button>
      <button class="btn-ghost" @click="goLobby()">🏠 大厅</button>
    </div>
    <strong>{{ g.level?.title }}</strong>
    <button class="btn-ghost" @click="g.screen = 'SETTINGS'">⚙️</button>
  </div>

  <!-- 目标 + 状态条 -->
  <div class="card row spread" style="flex-wrap: wrap; gap: 8px">
    <div class="row" style="gap: 8px">
      <span class="chip tag-pro">目标</span>
      <span class="subtitle">{{ g.level?.goalText }}</span>
    </div>
    <div class="row" style="gap: 8px">
      <span class="chip">尝试 {{ g.records.length }}</span>
      <span class="chip" style="color: var(--danger)">失败 {{ g.records.filter((r) => r.result.kind === 'failure').length }}</span>
      <button :disabled="!g.canUndo" @click="g.undo()">↶ 撤销</button>
      <button :disabled="!g.canRedo" @click="g.redo()">↷ 重做</button>
      <button @click="g.resetLevel()">⟲ 重置</button>
    </div>
  </div>

  <div class="grid" style="grid-template-columns: 1fr 1fr; align-items: start">
    <!-- 场景热点 -->
    <div class="card">
      <div class="subtitle" style="font-weight: 700; margin-bottom: 8px">场景热点</div>
      <div class="grid" style="gap: 10px">
        <div
          v-for="(st, tid) in g.scene"
          :key="tid"
          class="card"
          style="cursor: pointer; border: 2px dashed var(--line)"
          :class="{ 'cb-hint': g.selected.length === 1 }"
          @click="clickTarget(tid)"
        >
          <div class="row spread">
            <strong>{{ g.level?.targets.find((t) => t.id === tid)?.icon }} {{ g.level?.targets.find((t) => t.id === tid)?.name }}</strong>
            <span v-if="g.selected.length === 1" class="chip">用于 →</span>
          </div>
          <div class="subtitle" style="font-size: 0.8rem">{{ g.level?.targets.find((t) => t.id === tid)?.description }}</div>
          <div class="row" style="margin-top: 6px; flex-wrap: wrap; gap: 4px">
            <span v-for="(v, k) in st" :key="k" class="chip">{{ formatStatePair(String(k), v) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 背包 -->
    <div class="card">
      <div class="subtitle" style="font-weight: 700; margin-bottom: 8px">背包（点击选择）</div>
      <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px">
        <div
          v-for="inst in g.inventory"
          :key="inst.instanceId"
          class="card"
          :style="{ cursor: 'pointer', border: g.selected.includes(inst.instanceId) ? '2px solid var(--accent)' : '1px solid var(--line)', background: g.selected.includes(inst.instanceId) ? 'var(--panel-2)' : 'var(--panel)' }"
          @click="g.toggleSelect(inst.instanceId)"
        >
          <div class="row spread">
            <span style="font-size: 1.5rem">{{ iconOf(inst) }}</span>
            <button class="btn-ghost" style="padding: 2px 8px" @click.stop="inspected = inst.instanceId">🔍</button>
          </div>
          <div style="font-weight: 700; font-size: 0.9rem">{{ nameOf(inst) }}</div>
          <div v-if="stateText(inst.state)" class="chip" style="margin-top: 4px; font-size: 0.72rem">{{ stateText(inst.state) }}</div>
        </div>
      </div>
      <div class="row" style="margin-top: 12px">
        <button class="btn-primary" :disabled="g.selected.length < 2" @click="doCombine()">
          组合（{{ g.selected.length }}）
        </button>
        <button class="btn-ghost" :disabled="g.selected.length === 0" @click="g.clearSelect()">取消选择</button>
        <span v-if="g.selected.length === 1" class="subtitle">→ 点场景热点「使用」</span>
        <span v-else-if="g.selected.length >= 2" class="subtitle">→ 点「组合」</span>
      </div>
    </div>
  </div>

  <!-- 反馈浮层 -->
  <div v-if="g.lastResult" class="overlay" @click.self="closeFeedback()">
    <div
      class="dialog"
      :class="{ shake: g.lastResult.kind === 'failure' }"
      :style="{ borderTop: '5px solid ' + (g.lastResult.kind === 'failure' ? 'var(--danger)' : g.lastResult.kind === 'no-recipe' ? 'var(--tmp)' : 'var(--ok)') }"
    >
      <div style="font-weight: 800; margin-bottom: 8px">
        {{ g.lastResult.kind === 'failure' ? '💥 翻车了' : g.lastResult.kind === 'no-recipe' ? '🤔 没反应' : '✨ 有进展' }}
      </div>
      <p style="line-height: 1.6">{{ g.lastResult.feedback }}</p>
      <div class="row" style="justify-content: flex-end; margin-top: 10px">
        <button class="btn-primary" @click="closeFeedback()">继续</button>
      </div>
    </div>
  </div>

  <!-- 物品检查 -->
  <div v-if="inspectedItem" class="overlay" @click.self="inspected = null">
    <div class="dialog">
      <div class="row spread">
        <strong style="font-size: 1.1rem">{{ iconOf(inspectedItem) }} {{ nameOf(inspectedItem) }}</strong>
        <button class="btn-ghost" @click="inspected = null">✕</button>
      </div>
      <p class="subtitle" style="line-height: 1.6; margin-top: 8px">{{ ITEM_DEFS[inspectedItem.defId].description }}</p>
      <div class="subtitle" style="font-weight: 700; margin: 10px 0 4px">标签</div>
      <div class="row" style="flex-wrap: wrap; gap: 4px">
        <span v-for="t in tagsOf(inspectedItem)" :key="t" class="chip">{{ TAG_LABELS[t] ?? t }}</span>
      </div>
      <div v-if="stateText(inspectedItem.state)" class="subtitle" style="font-weight: 700; margin: 10px 0 4px">当前状态</div>
      <div class="row"><span v-if="stateText(inspectedItem.state)" class="chip">{{ stateText(inspectedItem.state) }}</span></div>
    </div>
  </div>
</template>
