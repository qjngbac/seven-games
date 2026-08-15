<script setup lang="ts">
import { computed } from 'vue';
import { useGame } from '../game/store';
const g = useGame();

const tierMeta = computed(() => {
  const t = g.solution?.tier;
  if (t === 'professional') return { label: '专业解法', cls: 'tag-pro', icon: '🏆' };
  if (t === 'temporary') return { label: '临时解法', cls: 'tag-tmp', icon: '🔧' };
  return { label: '离谱但有效', cls: 'tag-abs', icon: '🤪' };
});
const stars = computed(() => '★'.repeat(g.resultStars) + '☆'.repeat(3 - g.resultStars));
</script>

<template>
  <div class="card" style="text-align: center; padding: 30px 20px">
    <div style="font-size: 2.6rem">{{ tierMeta.icon }}</div>
    <div class="title-xl" style="font-size: 1.5rem">过关！</div>
    <span class="chip" :class="tierMeta.cls" style="margin: 8px">{{ tierMeta.label }}</span>
    <div style="font-size: 1.6rem; color: var(--tmp); letter-spacing: 4px">{{ stars }}</div>
    <p style="line-height: 1.7; max-width: 520px; margin: 14px auto">{{ g.solution?.endingText }}</p>
    <div class="row" style="justify-content: center; gap: 14px; margin-top: 8px">
      <span class="chip">得分 {{ g.resultScore }}</span>
      <span class="chip">尝试 {{ g.records.length }}</span>
      <span class="chip" style="color: var(--danger)">失败 {{ g.resultSummary?.errors ?? 0 }}</span>
      <span class="chip">搞笑分 {{ g.resultSummary?.comedy ?? 0 }}</span>
    </div>
    <div class="row" style="justify-content: center; margin-top: 18px">
      <button class="btn-primary" @click="g.nextLevel()">下一关 →</button>
      <button @click="g.startLevel(g.level!.id)">重玩本关</button>
      <button @click="g.screen = 'GALLERY'">📒 图鉴</button>
      <button class="btn-ghost" @click="g.goLevelSelect()">关卡列表</button>
    </div>
  </div>
</template>
