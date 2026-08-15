// 话题引擎：管理话题解锁（设计文档 §3.2 / §6.3）。
import type { CaseDef, CharacterId, Topic } from '../case-model/types'
import { matchCond, type InvestigationContext } from '../case-model/conditions'

/** 某话题当前是否解锁。 */
export function topicUnlocked(topic: Topic, character: CharacterId, ctx: InvestigationContext): boolean {
  return matchCond(topic.unlock, character, ctx)
}

/** 列出某角色当前可用（已解锁）的话题。 */
export function availableTopics(
  def: CaseDef,
  character: CharacterId,
  ctx: InvestigationContext
): Topic[] {
  return def.topics[character]?.filter((t) => topicUnlocked(t, character, ctx)) ?? []
}

/** 列出某角色全部话题及其解锁状态（用于 UI 灰显未解锁项）。 */
export function topicsWithState(
  def: CaseDef,
  character: CharacterId,
  ctx: InvestigationContext
): Array<{ topic: Topic; unlocked: boolean }> {
  return (def.topics[character] ?? []).map((t) => ({ topic: t, unlocked: topicUnlocked(t, character, ctx) }))
}
