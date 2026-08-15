<script setup lang="ts">
import { useGame } from "../stores/game";
const game = useGame();
</script>

<template>
  <div class="card center menu">
    <div class="title-xl">今天也要做决定</div>
    <div class="subtitle">搞笑叙事选择 · 轻度数值管理 · 一个荒诞的工作日</div>
    <div class="row" style="justify-content: center; margin-top: 18px">
      <button class="btn" @click="game.newGame()">新游戏</button>
      <button class="btn blue" v-if="game.canContinue" @click="game.continueGame()">
        继续
      </button>
    </div>
    <div class="subtitle" style="margin-top: 14px">
      内容：{{ game.CONTENT_STATS.kept }} 个事件 · 共 {{ game.CONTENT_STATS.total }} 条
    </div>
    <p class="tip">
      每个选择都有代价。你会「明知合理答案，却忍不住选那个更好笑的」——这就是今天的主题。
    </p>
  </div>
</template>

<style scoped>
.menu {
  padding: 36px 24px;
}
.tip {
  margin-top: 16px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}
</style>
