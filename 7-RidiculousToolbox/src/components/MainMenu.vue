<script setup lang="ts">
import { useGame } from '../game/store';
const g = useGame();
</script>

<template>
  <div class="card" style="text-align: center; padding: 40px 20px">
    <div style="font-size: 3.4rem">🧰</div>
    <div class="title-xl">离谱工具箱</div>
    <p class="subtitle">把看似无关的东西组合 / 用到场景上，<br />以专业、勉强、或离谱但有效的方式解决问题。</p>
    <div class="row" style="justify-content: center; margin-top: 18px">
      <button class="btn-primary" @click="g.goLevelSelect()">开始游戏</button>
      <button @click="g.startLevel('l1')">直接试玩第一章</button>
    </div>
    <div class="row" style="justify-content: center; margin-top: 10px">
      <button @click="g.screen = 'GALLERY'">📒 离谱图鉴（{{ g.galleryCount }}）</button>
      <button @click="g.screen = 'SETTINGS'">⚙️ 设置</button>
    </div>
    <p class="subtitle" style="margin-top: 18px">
      进度：已通关 {{ g.completedCount }} / {{ g.totalLevels }} 关
    </p>
  </div>
  <div class="card subtitle" style="font-size: 0.85rem">
    💡 玩法提示：先看右上角「目标」和场景里的热点；选中背包物品可<b>组合</b>或<b>用于</b>热点。
    同一问题往往有多种解法，失败也会留下有趣记录。所有操作可<b>撤销</b>。
  </div>
</template>
