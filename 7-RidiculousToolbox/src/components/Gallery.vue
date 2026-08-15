<script setup lang="ts">
import { useGame } from '../game/store';
const g = useGame();
</script>

<template>
  <div class="row spread">
    <button class="btn-ghost" @click="g.goMenu()">← 返回</button>
    <strong>离谱图鉴</strong>
    <span />
  </div>

  <div class="card">
    <p class="subtitle">这里收集你在解谜中触发的「独特失败组合」。它们没帮你过关，但都挺有节目效果。</p>
    <div v-if="g.galleryList.length === 0" class="subtitle" style="margin-top: 12px">还没有记录任何离谱组合，去试试看吧 🤪</div>
    <div v-else class="grid" style="margin-top: 12px; gap: 10px">
      <div v-for="e in g.galleryList" :key="e.recipeId" class="card" style="border-left: 4px solid var(--abs)">
        <div class="row spread">
          <strong>🤪 离谱组合：{{ e.title ?? g.fallbackTitle(e.recipeId) }}</strong>
          <span class="chip">×{{ e.count }}</span>
        </div>
        <p class="subtitle" style="line-height: 1.6; margin: 6px 0 0">{{ e.note }}</p>
        <p class="subtitle" style="margin: 4px 0 0; font-size: 12px; opacity: 0.55">#{{ e.recipeId }}</p>
      </div>
    </div>
    <div class="subtitle" style="margin-top: 14px">已收集 {{ g.galleryCount }} 种离谱组合。</div>
  </div>
</template>
