<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGame } from '../store'

const game = useGame()
const selected = ref<string | null>(null)
const linkType = ref<'support' | 'contradiction'>('contradiction')

const boardNodes = computed(() =>
  [...game.board.nodes.values()] as Array<{ id: string; kind: string; ref: string; label: string }>
)
const links = computed(() => game.board.links as Array<{ a: string; b: string; kind: string }>)

const suggestions = computed(() => game.suggestContradictions())

function labelOf(id: string): string {
  return boardNodes.value.find((n) => n.id === id)?.label ?? id
}

function clickNode(id: string) {
  if (selected.value === null) {
    selected.value = id
    return
  }
  if (selected.value === id) {
    selected.value = null
    return
  }
  game.linkNodes(selected.value, id, linkType.value)
  selected.value = null
}

function removeLink(a: string, b: string) {
  game.unlinkNodes(a, b)
}

function isValid(link: { a: string; b: string; kind: string }): boolean {
  const c = game.currentCase
  if (!c) return false
  return link.kind === 'contradiction'
    ? game.board.isValidLink(link.a, link.b, 'contradiction', c)
    : game.board.isValidLink(link.a, link.b, 'support', c)
}
</script>

<template>
  <div class="col" v-if="game.currentCase">
    <section class="card row" style="align-items: center">
      <span style="font-size: 1.6em">🧩</span>
      <div><div style="font-weight: 800">推理板</div><div class="fact">把互斥事实连成「矛盾」，即可识别谎言；连成「支持」可固化证据链。</div></div>
      <span class="spacer" style="flex: 1"></span>
      <button class="btn-ghost" @click="game.openAccusation()">⚖ 指控</button>
      <button class="btn-ghost" @click="game.beginInvestigation()">← 调查中心</button>
    </section>

    <div class="grid grid-2">
      <section class="card">
        <h3 style="margin: 0 0 8px">🔗 连接类型</h3>
        <div class="row">
          <button :class="{ 'btn-primary': linkType === 'contradiction' }" @click="linkType = 'contradiction'">矛盾 ⚡</button>
          <button :class="{ 'btn-primary': linkType === 'support' }" @click="linkType = 'support'">支持 ✓</button>
        </div>
        <p class="fact" style="margin-top: 8px">
          操作：先点一个节点，再点另一个即可建立「{{ linkType === 'contradiction' ? '矛盾' : '支持' }}」连接。
        </p>
        <h3 style="margin: 12px 0 8px">🧱 节点（已发现的事实 / 证据）</h3>
        <div class="grid grid-4">
          <button
            v-for="n in boardNodes"
            :key="n.id"
            class="chip"
            :style="selected === n.id ? 'outline:2px solid var(--accent); background:#2b3350' : ''"
            @click="clickNode(n.id)"
          >
            {{ n.label }}
          </button>
        </div>
      </section>

      <section class="card">
        <h3 style="margin: 0 0 8px">✅ 已建立的连接</h3>
        <div v-if="links.length === 0" class="muted">还没有连接。</div>
        <div v-else class="col" style="gap: 6px">
          <div v-for="(l, i) in links" :key="i" class="bubble row" style="align-items: center">
            <span :class="l.kind === 'contradiction' ? 'danger-text' : 'ok'">
              {{ l.kind === 'contradiction' ? '⚡ 矛盾' : '✓ 支持' }}
            </span>
            <span style="flex: 1; margin: 0 8px">{{ labelOf(l.a) }} ⟷ {{ labelOf(l.b) }}</span>
            <span v-if="isValid(l)" class="chip ok">有效</span>
            <span v-else class="chip">存疑</span>
            <button class="btn-ghost" @click="removeLink(l.a, l.b)">✕</button>
          </div>
        </div>

        <h3 style="margin: 14px 0 8px">💡 系统提示</h3>
        <div v-if="suggestions.length === 0" class="muted">暂无可提示的矛盾（或已全部识别）。</div>
        <div v-else class="col" style="gap: 6px">
          <div v-for="(p, i) in suggestions" :key="i" class="hint">
            发现潜在矛盾：<b>{{ game.currentCase.factLabels?.[p[0]] ?? p[0] }}</b> 与
            <b>{{ game.currentCase.factLabels?.[p[1]] ?? p[1] }}</b> 互斥，可在左侧连成「矛盾」。
          </div>
        </div>
      </section>
    </div>

    <section class="card">
      <h3 style="margin: 0 0 8px">📝 调查笔记</h3>
      <textarea
        :value="game.board.notes"
        @input="game.setNotes(($event.target as HTMLTextAreaElement).value)"
        rows="3"
        style="width: 100%; background: var(--bg-soft); color: var(--text); border: 1px solid var(--line); border-radius: 10px; padding: 10px; font-family: inherit"
        placeholder="记下你的推理……"
      ></textarea>
    </section>
  </div>
</template>
