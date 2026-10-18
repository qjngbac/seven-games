<script setup lang="ts">
import { ref, watch } from 'vue'
import { CaseDocument } from '../game/types'
import { useGame } from '../store'

const props = defineProps<{ doc: CaseDocument; selected: boolean }>()
const emit = defineEmits<{ (e: 'select'): void }>()

const game = useGame()
const verified = ref(false)
const warnExhausted = ref(false)

// 常见字段键名的中文化映射
const FIELD_LABEL_MAP: Record<string, string> = {
  name: '姓名',
  issuer: '签发机构',
  level: '电量',
  kind: '类别',
  purpose: '事由',
  valid: '有效状态',
  temp: '体温',
  type: '类型',
  no: '编号',
  ml: '容量 (ml)',
  value: '申报金额',
  cny: '现钞金额',
  score: '信用积分',
  complete: '备份状态',
  pass: '审核结果'
}

// 常见证件类型的标签中文化映射
const DOC_TYPE_LABEL_MAP: Record<string, string> = {
  access_pass: '通行许可',
  android_cert: '人格认证',
  application: '申请表',
  cash: '现钞凭据',
  charge_cert: '充电凭据',
  contraband: '违禁物品',
  declaration: '申报凭据',
  digital_id: '数字身份',
  fresh_food: '生鲜物品',
  genetic_id: '基因身份',
  goods: '购物凭据',
  health_cert: '健康申报',
  illegal_implant: '管制义体',
  liquid: '随身液体',
  memory: '记忆备份',
  passport: '护照证件',
  quarantine_cert: '检疫证明',
  social: '社会信用',
  transit_visa: '过境签证',
  vehicle_inspect: '车辆安检',
  visa: '入境外签',
  wild_animal: '管制动物',
  work_permit: '工作许可'
}

function formatKey(key: string | number): string {
  const k = String(key)
  return FIELD_LABEL_MAP[k] || k
}

function formatDocType(type: string): string {
  return DOC_TYPE_LABEL_MAP[type] || type
}

// 文档 id 跨申请者复用（如两人都交「通行证」），换文档时必须重置核验状态，
// 否则上一位申请者的核验结论会残留下一位的证件上
watch(
  () => props.doc,
  () => {
    verified.value = false
    warnExhausted.value = false
  }
)

function onVerify() {
  if (verified.value) return
  if (!game.canVerify()) {
    warnExhausted.value = true
    return
  }
  game.recordVerify()
  verified.value = true
  warnExhausted.value = false
}
</script>

<template>
  <div
    class="card doc"
    :style="{ borderColor: selected ? 'var(--accent)' : 'var(--line)', cursor: 'pointer' }"
    @click="emit('select')"
  >
    <div style="display: flex; align-items: center; justify-content: space-between">
      <strong>📄 {{ doc.title }}</strong>
      <span class="chip">{{ formatDocType(doc.type) }}</span>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 10px 0 4px; font-size: 14px">
      <tbody>
        <tr v-for="(val, key) in doc.fields" :key="key">
          <td class="muted" style="padding: 3px 8px 3px 0; width: 40%">{{ formatKey(key) }}</td>
          <td style="padding: 3px 0; font-weight: 600">{{ val }}</td>
        </tr>
        <tr v-if="doc.issueDate">
          <td class="muted" style="padding: 3px 8px 3px 0">签发日期</td>
          <td style="padding: 3px 0; font-weight: 600">{{ doc.issueDate }}</td>
        </tr>
      </tbody>
    </table>

    <p v-if="doc.note" class="muted" style="font-size: 12px; margin: 4px 0 0">※ {{ doc.note }}</p>

    <div style="margin-top: 8px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap">
      <button style="font-size: 12px; padding: 5px 10px" @click.stop="onVerify">🔍 核验真伪</button>
      <span
        v-if="verified"
        :style="{ fontSize: '12px', color: doc.authentic ? 'var(--ok)' : 'var(--danger)', fontWeight: 700 }"
      >
        {{ doc.authentic ? '✓ 验真通过：印信清晰，防伪暗记与官方档案一致' : '🚨 验真警报：印章模糊、防伪暗记缺失，系伪造仿冒公文！（依法就地暂扣）' }}
      </span>
      <span v-else-if="warnExhausted" style="font-size: 12px; color: var(--warn)">
        ⚠️ 本人已核验过一份文件，精力已达上限
      </span>
    </div>
  </div>
</template>
