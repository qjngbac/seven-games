<script setup lang="ts">
import { computed, ref } from "vue";
import { useGame } from "../stores/game";
import { CONTENT } from "../data";

const game = useGame();
const info = computed(() => game.endingInfo);
const showTimeline = ref(false);

const stats = computed(() => {
  const g = game.game!;
  return {
    day: g.day,
    choices: g.choiceLog.length,
    tags: g.tags.length,
  };
});

function formatDelta(delta: Record<string, number | undefined>): string {
  const parts: string[] = [];
  const map: Record<string, string> = { money: "金钱", reputation: "声誉", spirit: "精神", techDebt: "技术债" };
  for (const [k, v] of Object.entries(delta)) {
    if (v != null && v !== 0) {
      parts.push(`${map[k] ?? k} ${v > 0 ? "+" + v : v}`);
    }
  }
  return parts.length ? parts.join("，") : "无数值变动";
}
</script>

<template>
  <div class="card center ending" v-if="info && game.game">
    <div class="ending-badge-icon">{{ info.icon || (info.kind === 'win' ? '🎉' : '💀') }}</div>
    <div class="ekind" :class="info.kind">{{ info.kind === "win" ? "🎉 达成通关结局" : "💀 游戏结束" }}</div>
    <h2 class="etitle">{{ info.title }}</h2>
    <p class="etext">{{ info.text }}</p>
    <div class="honor">称号：{{ info.honor }}</div>

    <div class="stats">
      <div><b>{{ stats.day }}</b><span>生存天数</span></div>
      <div><b>{{ stats.choices }}</b><span>做出选择</span></div>
      <div><b>{{ stats.tags }}</b><span>获得标签</span></div>
    </div>

    <!-- 最终资源底牌 -->
    <div class="final-res-row">
      <div v-for="d in CONTENT.resources" :key="d.key" class="res-item">
        <span>{{ d.icon }} {{ d.name }}</span>
        <b>{{ game.game.resources[d.key] }}</b>
      </div>
    </div>

    <!-- 决策历程展开 -->
    <div class="timeline-section">
      <button class="btn ghost small toggle-timeline-btn" @click="showTimeline = !showTimeline">
        📜 {{ showTimeline ? '收起本周目历程流水' : '展开本周目荒诞抉择回顾 (' + stats.choices + ' 次决策)' }}
      </button>

      <div v-if="showTimeline" class="ending-timeline">
        <div v-for="(log, i) in game.game.choiceLog" :key="i" class="timeline-card">
          <div class="tc-day">第 {{ log.day }} 天 · {{ log.eventTitle }}</div>
          <div class="tc-choice">👉 <b>你的决定：</b>{{ log.choiceText }}</div>
          <div class="tc-result">{{ log.resultText }}</div>
          <div class="tc-delta" v-if="formatDelta(log.resourceDelta) !== '无数值变动'">
            ⚡ {{ formatDelta(log.resourceDelta) }}
          </div>
        </div>
      </div>
    </div>

    <div class="row" style="justify-content: center; margin-top: 22px; gap: 12px; flex-wrap: wrap">
      <button class="btn" @click="game.newGame()">再玩一次</button>
      <button class="btn ghost" @click="game.openHistory('gallery')">🏆 结局图鉴与历史</button>
      <button class="btn ghost" @click="game.restart()">回主菜单</button>
    </div>
  </div>
</template>

<style scoped>
.ending-badge-icon {
  font-size: 52px;
  line-height: 1;
  margin-bottom: 6px;
}
.ekind {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}
.ekind.win {
  color: var(--good);
}
.ekind.lose {
  color: var(--crit);
}
.etitle {
  font-size: 26px;
  margin: 6px 0;
}
.etext {
  line-height: 1.7;
  color: #3a3a3a;
  max-width: 580px;
  margin: 0 auto 12px;
}
.honor {
  display: inline-block;
  background: #fff8ef;
  border: 1px dashed var(--warn);
  border-radius: 20px;
  padding: 6px 16px;
  font-weight: 700;
  font-size: 14px;
}
.stats {
  display: flex;
  justify-content: center;
  gap: 28px;
  margin-top: 18px;
}
.stats div {
  display: flex;
  flex-direction: column;
}
.stats b {
  font-size: 26px;
  color: var(--accent);
}
.stats span {
  font-size: 12px;
  color: var(--muted);
}
.final-res-row {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}
.res-item {
  background: #fcfbf9;
  border: 1px solid var(--line);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  display: flex;
  gap: 6px;
  align-items: center;
}
.res-item b {
  color: var(--accent);
}
.timeline-section {
  margin-top: 20px;
  border-top: 1px dashed var(--line);
  padding-top: 16px;
}
.toggle-timeline-btn {
  font-size: 13px;
  padding: 6px 14px;
}
.ending-timeline {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
  text-align: left;
  max-height: 320px;
  overflow-y: auto;
  padding-right: 4px;
}
.timeline-card {
  background: #fbfbfa;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
}
.tc-day {
  font-weight: 700;
  color: var(--accent);
  font-size: 12px;
  margin-bottom: 2px;
}
.tc-choice {
  color: #333;
  margin-bottom: 4px;
}
.tc-result {
  color: #666;
  background: #fff;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px dashed #e3e1d6;
  font-size: 12px;
  line-height: 1.5;
}
.tc-delta {
  font-size: 11.5px;
  color: var(--accent);
  margin-top: 4px;
  font-weight: 600;
}
</style>
