<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../store'
import { ACTION_BY_ID } from '../data/actions'

const store = useGameStore()
const action = computed(() => (store.pendingAction ? ACTION_BY_ID[store.pendingAction] : null))
</script>

<template>
  <div class="modal-back" @click.self="store.cancelConfirm()">
    <div class="panel modal">
      <h2 style="color: var(--error)">⚠ 高危不可逆操作</h2>
      <p v-if="action" style="font-size: 15px; font-weight: 700">{{ action.name }}</p>
      <p v-if="action" class="muted">{{ action.desc }}</p>
      <p style="font-size: 13px; color: var(--warn)">
        此操作将产生损失（{{ action?.damage ?? 0 }}）且不可撤销。确定要执行吗？
      </p>
      <div class="row" style="justify-content: flex-end; margin-top: 8px">
        <button class="ghost" @click="store.cancelConfirm()">取消</button>
        <button class="danger" @click="store.confirmHighRisk()">确认执行</button>
      </div>
    </div>
  </div>
</template>
