<script setup lang="ts">
import { useGame } from '../game/store';
const g = useGame();
</script>

<template>
  <div class="overlay" @click.self="g.finishTutorial()">
    <div class="dialog">
      <div style="font-size: 1.6rem; font-weight: 800">🧰 怎么玩</div>
      <ol style="line-height: 1.8; padding-left: 20px; margin: 12px 0">
        <li>看右上角<b>目标</b>，以及场景里的<b>热点</b>（服务器、水管、门…）。</li>
        <li>在<b>背包</b>里点选物品：选 <b>1 件</b>再点热点 = 把物品<b>用于</b>热点；选 <b>2 件</b>再点「组合」= 把它们<b>组合</b>。</li>
        <li>每件物品有固定<b>标签</b>（fan / adhesive / liquid…），组合与反馈都从标签解释，多观察就能推理。</li>
        <li>同一问题常有<b>专业 / 临时 / 离谱</b>多种解法，评分不同。</li>
        <li>所有操作可<b>撤销</b>；翻车也别怕，独特失败会进<b>离谱图鉴</b>。</li>
      </ol>
      <div class="row" style="justify-content: flex-end">
        <button class="btn-primary" @click="g.finishTutorial()">开始折腾 →</button>
      </div>
    </div>
  </div>
</template>
