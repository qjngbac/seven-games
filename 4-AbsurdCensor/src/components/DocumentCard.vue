<script setup lang="ts">
import { ref } from 'vue'
import { CaseDocument } from '../game/types'

const props = defineProps<{ doc: CaseDocument; selected: boolean }>()
const emit = defineEmits<{ (e: 'select'): void }>()

const verified = ref(false)
</script>

<template>
  <div
    class="card doc"
    :style="{ borderColor: selected ? 'var(--accent)' : 'var(--line)', cursor: 'pointer' }"
    @click="emit('select')"
  >
    <div style="display: flex; align-items: center; justify-content: space-between">
      <strong>📄 {{ doc.title }}</strong>
      <span class="chip">{{ doc.type }}</span>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 10px 0 4px; font-size: 14px">
      <tbody>
        <tr v-for="(val, key) in doc.fields" :key="key">
          <td class="muted" style="padding: 3px 8px 3px 0; width: 40%">{{ key }}</td>
          <td style="padding: 3px 0; font-weight: 600">{{ val }}</td>
        </tr>
        <tr v-if="doc.issueDate">
          <td class="muted" style="padding: 3px 8px 3px 0">签发日期</td>
          <td style="padding: 3px 0; font-weight: 600">{{ doc.issueDate }}</td>
        </tr>
      </tbody>
    </table>

    <p v-if="doc.note" class="muted" style="font-size: 12px; margin: 4px 0 0">※ {{ doc.note }}</p>

    <div style="margin-top: 8px; display: flex; gap: 8px; align-items: center">
      <button style="font-size: 12px; padding: 5px 10px" @click.stop="verified = true">🔍 核验真伪</button>
      <span
        v-if="verified"
        :style="{ fontSize: '12px', color: doc.authentic ? 'var(--ok)' : 'var(--danger)', fontWeight: 700 }"
      >
        {{ doc.authentic ? '✓ 印章清晰、编号合规，未见伪造痕迹' : '⚠ 印章模糊、编号异常，疑似伪造' }}
      </span>
    </div>
  </div>
</template>
