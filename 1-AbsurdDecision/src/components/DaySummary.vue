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
</style>
