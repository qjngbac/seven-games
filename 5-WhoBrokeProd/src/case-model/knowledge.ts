// 角色知识模型：表示角色所知、所信和意图。不负责 UI 文案排版（设计文档 §6.3）。
import type { CaseDef, CharacterId, FactId, CharacterKnowledge, EvidenceId } from './types'

/** 意图含义（用于结局评价与文档可读，不影响裁决逻辑）。 */
export const INTENT_LABEL: Record<CharacterKnowledge['intent'], string> = {
  honest: '诚实',
  lie: '撒谎',
  misunderstand: '误解',
  forget: '记错',
  secret: '隐瞒'
}

export function getKnowledge(def: CaseDef, character: CharacterId): CharacterKnowledge | undefined {
  return def.knowledge.find((k) => k.character === character)
}

/** 角色是否"知道"某事实（亲眼/听说/相信，含保密事实——保密只是不愿主动说）。 */
export function knowsFact(k: CharacterKnowledge, fact: FactId): boolean {
  return (
    k.observed.includes(fact) ||
    k.heard.includes(fact) ||
    k.beliefs.includes(fact) ||
    k.secrets.includes(fact)
  )
}

/**
 * 当玩家对该角色出示某项证据时，角色是否会"吐露"某个保密事实。
 * 规则：证据所支持的事实若与保密事实相关（同属一个真相事件），则被迫承认。
 * 这里用简单映射：出示的证据覆盖了该保密事实，或覆盖了与其互斥的公开说法，即吐露。
 */
export function revealableByEvidence(def: CaseDef, k: CharacterKnowledge, evId: EvidenceId): FactId[] {
  const ev = def.evidence.find((e) => e.id === evId)
  if (!ev) return []
  const out: FactId[] = []
  for (const secret of k.secrets) {
    // 证据直接支持该保密事实，或证据与角色"公开说法"互斥 -> 被迫承认
    if (ev.facts.includes(secret)) out.push(secret)
  }
  return out
}
