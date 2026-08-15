<script setup lang="ts">
import { useGameStore } from '../store'
import { DEVICE_BY_ID } from '../data/devices'

const store = useGameStore()
</script>

<template>
  <div class="panel" v-if="store.wo">
    <h2>工单简报 · {{ store.wo.title }}</h2>
    <div class="row" style="margin-bottom: 12px">
      <span class="tag rev">{{ store.wo.scene }}</span>
      <span class="tag">限时 {{ store.wo.constraints.timeBudget }} 步</span>
      <span v-if="store.wo.constraints.noFactoryReset" class="tag risk">禁止恢复出厂</span>
      <span v-if="store.wo.faults.length > 1" class="tag risk">并发故障 ×{{ store.wo.faults.length }}</span>
    </div>

    <div style="margin-bottom: 12px">
      <div class="muted" style="font-size: 13px">客户描述</div>
      <div style="background: var(--panel-2); border: 1px solid var(--line); border-radius: 10px; padding: 10px; margin-top: 4px">
        “{{ store.wo.customer }}”
      </div>
    </div>

    <div style="margin-bottom: 12px">
      <div class="muted" style="font-size: 13px">现场设备</div>
      <div class="row" style="margin-top: 4px">
        <span v-for="id in store.wo.devices" :key="id" class="chip">
          {{ DEVICE_BY_ID[id]?.icon }} {{ DEVICE_BY_ID[id]?.name ?? id }}
        </span>
      </div>
    </div>

    <div style="margin-bottom: 12px">
      <div class="muted" style="font-size: 13px">验收条件（修好后需全部满足）</div>
      <ul style="margin: 6px 0 0; padding-left: 18px; font-size: 14px">
        <li v-for="(acc, i) in store.wo.acceptance" :key="i">
          {{ acc.device }} 的 {{ acc.comp }} = {{ acc.equals }}
        </li>
      </ul>
    </div>

    <div v-if="store.wo.tutorial" style="margin-bottom: 12px; font-size: 13px; color: var(--accent)">
      💡 {{ store.wo.tutorial }}
    </div>

    <div class="spread">
      <span class="muted" style="font-size: 12px">进入现场后每次操作推进时间，并记录时间线用于复盘。</span>
      <button class="primary" @click="store.startSite()">进入现场 →</button>
    </div>
  </div>
</template>
