<script setup lang="ts">
import { onMounted, onUnmounted, computed } from "vue";
import { useGame } from "../stores/game";
import { CONTENT } from "../data";
import type { ResourceKey } from "../core/types";

const game = useGame();

const today = computed(() => {
  const g = game.game!;
  const entries = g.choiceLog.filter((e) => e.day === g.day);
  const net = {} as Record<ResourceKey, number>;
  for (const e of entries) {
    for (const k of Object.keys(e.resourceDelta) as ResourceKey[]) {
      net[k] = (net[k] ?? 0) + (e.resourceDelta[k] ?? 0);
    }
  }
  // 最离谱操作：单条选择资源变化绝对值最大者
  let wild = entries[0] ?? null;
  let wildAbs = -1;
  for (const e of entries) {
    const s = Object.values(e.resourceDelta).reduce((a, b) => a + Math.abs(b ?? 0), 0);
    if (s > wildAbs) {
      wildAbs = s;
      wild = e;
    }
  }
  return { entries, net, wild };
});

const netChips = computed(() =>
  (Object.keys(today.value.net) as ResourceKey[])
    .map((k) => ({ k, v: today.value.net[k] }))
    .filter((x) => x.v !== 0)
    .map((x) => {
      const d = CONTENT.resources.find((r) => r.key === x.k)!;
      return { icon: d.icon, name: d.name, v: x.v };
    })
);

function onKey(e: KeyboardEvent) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    game.proceedFromSummary();
  }
}
onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));

/** 资源曲线配色（与资源条一致） */
const SERIES_COLOR: Record<ResourceKey, string> = {
  money: "#d99a1e",
  reputation: "#3f7fd1",
  spirit: "#8a5cd6",
  techDebt: "#d64545",
};

/**
 * 资源变化曲线：把 state.history 里每天的开局快照画成折线。
 * 每条资源按自身 [min,max] 归一化到同一高度，便于看清趋势（不追求绝对可比）。
 */
const chart = computed(() => {
  const g = game.game!;
  const hist = g.history;
  if (hist.length < 2) return null;
  const W = 340;
  const H = 110;
  const PAD = 10;
  const days = hist.map((h) => h.day);
  const minDay = Math.min(...days);
  const span = Math.max(1, Math.max(...days) - minDay);
  const series = CONTENT.resources.map((d) => {
    const range = Math.max(1, d.max - d.min);
    const points = hist
      .map((h) => {
        const x = PAD + ((h.day - minDay) / span) * (W - PAD * 2);
        const y = H - PAD - ((h.resources[d.key] - d.min) / range) * (H - PAD * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    return { key: d.key, name: d.name, icon: d.icon, color: SERIES_COLOR[d.key], points };
  });
  return { W, H, series, first: minDay, last: Math.max(...days) };
});
</script>

<template>
  <div class="card summary" v-if="game.game">
    <div class="subtitle">DAY {{ game.game.day }} 结束</div>
    <h2 style="margin: 4px 0 10px">今日结算</h2>

    <div class="block">
      <div class="bh">处理了 {{ today.entries.length }} 个事件</div>
      <div class="chips">
        <span v-for="c in netChips" :key="c.name" class="chip" :class="c.v > 0 ? 'up' : 'down'">
          {{ c.icon }} {{ c.name }} {{ c.v > 0 ? "+" : "" }}{{ c.v }}
        </span>
        <span v-if="!netChips.length" class="chip flat">数值整体平稳</span>
      </div>
    </div>

    <div class="block" v-if="chart">
      <div class="bh">资源走势（每资源按自身区间归一化）</div>
      <svg class="curve" :viewBox="`0 0 ${chart.W} ${chart.H}`" role="img" aria-label="资源变化曲线">
        <line :x1="10" :y1="chart.H - 10" :x2="chart.W - 10" :y2="chart.H - 10" class="axis" />
        <polyline
          v-for="s in chart.series"
          :key="s.key"
          :points="s.points"
          fill="none"
          :stroke="s.color"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <circle
          v-for="s in chart.series"
          :key="s.key + '-end'"
          :cx="s.points.split(' ').slice(-1)[0].split(',')[0]"
          :cy="s.points.split(' ').slice(-1)[0].split(',')[1]"
          r="2.6"
          :fill="s.color"
        />
      </svg>
      <div class="legend">
        <span v-for="s in chart.series" :key="s.key" class="lg">
          <i :style="{ background: s.color }"></i>{{ s.icon }} {{ s.name }}
        </span>
        <span class="lg-x">第 {{ chart.first }} → {{ chart.last }} 天</span>
      </div>
    </div>

    <div class="block" v-if="today.wild">
      <div class="bh">最离谱操作</div>
      <div class="wild">「{{ today.wild.choiceText }}」</div>
      <div class="wild-r">{{ today.wild.resultText }}</div>
    </div>

    <div class="block">
      <div class="bh">当前标签（{{ game.game.tags.length }}）</div>
      <div class="tags">
        <span v-for="t in game.game.tags" :key="t" class="tag">#{{ t }}</span>
        <span v-if="!game.game.tags.length" class="tag flat">暂无</span>
      </div>
    </div>

    <div class="row" style="justify-content: flex-end; margin-top: 14px">
      <button class="btn" @click="game.proceedFromSummary()">
        {{ game.game.day >= game.game.maxDays ? "查看结局 (Enter)" : "进入第 " + (game.game.day + 1) + " 天 (Enter)" }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.block {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}
.bh {
  font-weight: 700;
  font-size: 13px;
  color: var(--accent2);
  margin-bottom: 6px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  border-radius: 20px;
  padding: 6px 12px;
  font-weight: 700;
  font-size: 14px;
}
.chip.up {
  background: #e7f7ee;
  color: var(--good);
}
.chip.down {
  background: #fdecea;
  color: var(--crit);
}
.chip.flat {
  background: #f0eee8;
  color: var(--muted);
}
.wild {
  font-weight: 700;
}
.wild-r {
  color: var(--muted);
  font-size: 13px;
  margin-top: 4px;
  line-height: 1.6;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag {
  background: #eef1f6;
  border-radius: 14px;
  padding: 4px 10px;
  font-size: 12px;
}
.tag.flat {
  color: var(--muted);
}
.curve {
  width: 100%;
  height: auto;
  display: block;
  background: #fbfaf7;
  border: 1px solid var(--line);
  border-radius: 8px;
}
.axis {
  stroke: var(--line);
  stroke-width: 1;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--muted);
  align-items: center;
}
.lg {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.lg i {
  width: 10px;
  height: 3px;
  border-radius: 2px;
  display: inline-block;
}
.lg-x {
  margin-left: auto;
}
</style>
