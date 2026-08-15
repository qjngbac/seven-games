// 回答选择：根据角色、话题、已出示证据、关系与已知版本，选优先级最高的回答（设计文档 §6.4）。
import type { Topic, DialogueResponse, CharacterId } from '../case-model/types'
import { matchCond, type InvestigationContext } from '../case-model/conditions'

/**
 * 从话题的回答版本中选出当前应展示的回答。
 * 规则：candidates = responses.filter(conditionsMatch); 取 priority 最大者。
 * 若没有任何版本条件匹配（理论上不应发生，因应有兜底 when 缺省版本），返回优先级最高者兜底。
 */
export function selectResponse(
  topic: Topic,
  character: CharacterId,
  ctx: InvestigationContext
): DialogueResponse {
  const matched = topic.responses.filter((r) => matchCond(r.when, character, ctx))
  if (matched.length === 0) {
    // 兜底：取无 when 条件的版本；若仍无，取 priority 最高
    const fallback = topic.responses.find((r) => !r.when) ?? [...topic.responses].sort((a, b) => b.priority - a.priority)[0]
    return fallback
  }
  return [...matched].sort((a, b) => b.priority - a.priority)[0]
}

/** 应用一个回答的副作用：返回它解锁的话题与给出的证据。 */
export function applyResponseEffects(res: DialogueResponse): {
  unlocks: string[]
  revealsEvidence: string[]
} {
  return {
    unlocks: res.unlocks ?? [],
    revealsEvidence: res.revealsEvidence ?? []
  }
}
