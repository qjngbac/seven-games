<script setup lang="ts">
import { useGame } from '../store'

const game = useGame()
</script>

<template>
  <div class="center-screen scroll" style="align-items: stretch; max-width: 760px; margin: 0 auto">
    <div class="card" style="text-align: left">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px">
        <span style="font-size: 30px">{{ game.currentScene?.icon }}</span>
        <div>
          <div class="muted" style="font-size: 12px">{{ game.currentScene?.name }} · 第 {{ game.dayNumber }} / {{ game.currentScene?.days.length }} 天</div>
          <h2 style="margin: 0">{{ game.currentDay?.title }}</h2>
        </div>
      </div>
      <p class="muted" style="margin: 0 0 4px">今日日期：{{ game.currentDay?.today }}</p>

      <div style="background: var(--panel-2); border-left: 3px solid var(--accent); padding: 12px 14px; border-radius: 8px; margin: 14px 0; line-height: 1.7">
        <strong>【晨间公告】</strong><br />
        {{ game.currentDay?.brief }}
      </div>

      <div style="background: var(--panel-2); border-left: 3px solid var(--stamp-detain); padding: 12px 14px; border-radius: 8px; margin: 10px 0; line-height: 1.7">
        <strong>【今日新闻】</strong><br />
        {{ game.currentDay?.news }}
      </div>

      <p class="muted" style="margin: 14px 0 6px">📜 今日生效规则（共 {{ game.currentRules.length }} 条，<span class="tag-new">黄框</span>为新增）：</p>
      <ul style="margin: 0; padding-left: 18px; line-height: 1.8">
        <li
          v-for="r in game.currentRules"
          :key="r.id"
          :style="{
            border: game.currentDay?.isNew?.includes(r.id) ? '1px solid var(--rule-new)' : '1px solid transparent',
            borderRadius: '6px',
            padding: '2px 6px',
            margin: '2px 0'
          }"
        >
          <span class="tag-new" v-if="game.currentDay?.isNew?.includes(r.id)">［新］</span>
          {{ r.explain }}
          <span class="muted" style="font-size: 12px">（优先级 {{ r.priority }}）</span>
        </li>
      </ul>

      <p class="muted" style="margin-top: 14px">今日配额：至少处理 {{ game.currentDay?.quota }} 人。</p>

      <button class="btn-primary" style="margin-top: 18px; width: 100%; font-size: 17px" @click="game.beginDay()">
        进入工作台 →
      </button>
    </div>
  </div>
</template>
