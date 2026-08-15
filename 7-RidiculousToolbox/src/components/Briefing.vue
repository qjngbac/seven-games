<script setup lang="ts">
import { useGame } from '../game/store';
import { ITEM_DEFS } from '../data/items';
const g = useGame();
</script>

<template>
  <div class="row spread">
    <button class="btn-ghost" @click="g.goLevelSelect()">← 返回</button>
    <strong>关卡简报</strong>
    <span />
  </div>

  <div v-if="g.level" class="card">
    <div class="title-xl" style="font-size: 1.3rem">{{ g.level.title }}</div>
    <p style="line-height: 1.6">{{ g.level.brief }}</p>
    <div class="row" style="margin: 10px 0">
      <span class="chip tag-pro">目标</span>
      <span>{{ g.level.goalText }}</span>
    </div>
    <div class="subtitle" style="font-weight: 700; margin: 12px 0 6px">背包初始物品</div>
    <div class="row">
      <span v-for="(it, i) in g.level.items" :key="i" class="chip cb-hint">
        {{ ITEM_DEFS[it.defId].icon }} {{ ITEM_DEFS[it.defId].name }}
      </span>
    </div>
    <div class="subtitle" style="font-size: 0.82rem; margin-top: 12px">
      提示：每件物品有固定标签（如 fan / adhesive / liquid），组合与场景反馈都从标签解释，多观察就能推理出解法。
    </div>
    <div class="row" style="margin-top: 16px">
      <button class="btn-primary" @click="g.startLevel(g.level!.id)">开始解谜</button>
      <button class="btn-ghost" @click="g.goLevelSelect()">再看看</button>
    </div>
  </div>
</template>
