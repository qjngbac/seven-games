// 指控校验器：把提交映射到验收条件，不用字符串关键词判断（设计文档 §3.5/§5）。
import type { CaseDef, Claim, ClaimVerdict, FactId, CharacterId } from './types'
import { timeDiff, toMin } from './truth-graph'

/** 规范化字符串：去空白与标点、转小写，用于等价比对。 */
export function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\s,，。.、：:；;!！?？'"'"'""''()（）\[\]【】]/g, '')
}

export function actionMatches(claimAction: string, acceptanceAction: string, aliases?: string[]): boolean {
  if (norm(claimAction) === norm(acceptanceAction)) return true
  return (aliases ?? []).some((a) => norm(claimAction) === norm(a))
}

/**
 * 校验玩家指控。
 * 判定顺序：
 *  - 主责任人未全部指认 或 误指认了无辜者 → 'fail'（错怪好人）
 *  - 责任人正确，但行为/证据/事实/时间不全 → 'partial'（证据不足，可继续调查）
 *  - 责任人正确且全齐 → 若遗漏管理/次要责任则 'partial'，否则 'success'
 */
export function validateClaim(def: CaseDef, claim: Claim, discoveredFacts: FactId[]): ClaimVerdict {
  const acc = def.acceptance
  const responsible = acc.responsible
  const contributory = acc.contributory ?? []
  const allowedActors = new Set<CharacterId>([...responsible, ...contributory])

  const namedSet = new Set<CharacterId>(claim.actors)
  const missingResponsible = responsible.filter((a) => !namedSet.has(a))
  const wrongActors = claim.actors.filter((a) => !allowedActors.has(a))

  const correctActors = missingResponsible.length === 0
  const actionOk = actionMatches(claim.action, acc.action, acc.actionAliases)
  const timeOk = checkTime(def, claim.time, acc)

  // 证据：requiredEvidence 全量引用，或达到 minEvidence 阈值
  const reqEv = acc.requiredEvidence ?? []
  const needEv = acc.minEvidence ?? reqEv.length
  const referencedEv = reqEv.filter((e) => claim.evidence.includes(e))
  const missingEvidence = reqEv.filter((e) => !claim.evidence.includes(e))
  const evidenceOk = reqEv.length === 0 ? claim.evidence.length > 0 : referencedEv.length >= needEv

  // 事实：玩家已发现（看过证据 / 听过证词）
  const discSet = new Set<FactId>(discoveredFacts)
  const reqFacts = acc.requiredFacts ?? []
  const missingFacts = reqFacts.filter((f) => !discSet.has(f))
  const factsOk = reqFacts.length === 0 || missingFacts.length === 0

  const missingContributory = contributory.filter((a) => !namedSet.has(a))

  // 组装信息
  const base: ClaimVerdict = {
    outcome: 'fail',
    correctActors,
    missingResponsible,
    wrongActors,
    missingEvidence,
    missingFacts,
    missingContributory,
    message: ''
  }

  if (!correctActors) {
    base.outcome = 'fail'
    base.message = `主责任人认定错误：你遗漏了 ${missingResponsible.join('、')}。指认错误的人，无法结案。`
    return base
  }
  if (wrongActors.length > 0) {
    base.outcome = 'fail'
    base.message = `你误指认了无辜者：${wrongActors.join('、')}。错怪好人会让真凶逃脱。`
    return base
  }

  // 责任人正确，检查完整性
  const gaps: string[] = []
  if (!actionOk) gaps.push('危险行为描述不符')
  if (!evidenceOk) gaps.push(`关键证据不足（缺少 ${missingEvidence.join('、')}）`)
  if (!factsOk) gaps.push(`关键事实未落实（缺少 ${missingFacts.join('、')}）`)
  if (!timeOk) gaps.push('案发时间不符')

  if (gaps.length > 0) {
    base.outcome = 'partial'
    base.message = `证据不足：${gaps.join('；')}。可继续调查后重新指控。`
    return base
  }

  if (missingContributory.length > 0) {
    base.outcome = 'partial'
    base.message = `你锁定了主责任人，但遗漏了管理/次要责任（${missingContributory.join('、')}）。指控成立但不完整。`
    return base
  }

  base.outcome = 'success'
  base.message = '指控成立，事件链完整。'
  return base
}

/** 找出 responsible 行为对应的真相事件时间，判定玩家指认时间是否在容差内。 */
function checkTime(def: CaseDef, claimTime: string, acc: CaseDef['acceptance']): boolean {
  const ev = def.truthEvents.find((e) => norm(e.action) === norm(acc.action))
  if (!ev) return true
  const window = acc.timeWindowMin ?? 0
  return timeDiff(claimTime, ev.time) <= window
}

/** 导出给 UI 使用：责任行为对应的规范时间（用于时间下拉默认值）。 */
export function canonicalTimeForAction(def: CaseDef, action: string): string | undefined {
  const ev = def.truthEvents.find((e) => norm(e.action) === norm(action))
  return ev?.time
}

export { toMin }
