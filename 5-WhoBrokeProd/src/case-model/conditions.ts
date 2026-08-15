// 条件匹配：对白回答触发条件与话题解锁条件共用。
import type { ResponseCond, FactId, CharacterId, EvidenceId, TopicId } from './types'

/** 调查上下文（由 store 维护，随玩家行动更新）。 */
export interface InvestigationContext {
  discoveredFacts: FactId[]
  presentedEvidence: Partial<Record<CharacterId, EvidenceId[]>>
  askedTopics: Partial<Record<CharacterId, TopicId[]>>
  trust: Partial<Record<CharacterId, number>>
}

/** 判定一个 ResponseCond 在当前上下文是否成立。 */
export function matchCond(
  cond: ResponseCond | undefined,
  character: CharacterId,
  ctx: InvestigationContext
): boolean {
  if (!cond) return true
  const disc = new Set(ctx.discoveredFacts)
  if (cond.discoveredFacts && !cond.discoveredFacts.every((f) => disc.has(f))) return false
  const pres = ctx.presentedEvidence[character] ?? []
  if (cond.presentedEvidence && !cond.presentedEvidence.every((e) => pres.includes(e))) return false
  const asked = ctx.askedTopics[character] ?? []
  if (cond.askedTopics && !cond.askedTopics.every((t) => asked.includes(t))) return false
  if (cond.notAskedTopics && !cond.notAskedTopics.every((t) => !asked.includes(t))) return false
  if (cond.minTrust !== undefined && (ctx.trust[character] ?? 0) < cond.minTrust) return false
  return true
}
