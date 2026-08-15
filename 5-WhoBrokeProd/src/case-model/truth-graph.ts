// 真相图：保存客观真相与案件 schema。不根据玩家行为改写真相（设计文档 §6.3）。
import type { CaseDef, FactId, CharacterId, EvidenceId, TruthEvent } from './types'

export class TruthGraph {
  constructor(public readonly def: CaseDef) {}

  /** 全部客观事实（所有真相事件事实的并集）。 */
  allTruthFacts(): FactId[] {
    const set = new Set<FactId>()
    for (const e of this.def.truthEvents) for (const f of e.facts) set.add(f)
    return [...set]
  }

  /** 按责任人查询真相事件。 */
  eventsByActor(actor: CharacterId): TruthEvent[] {
    return this.def.truthEvents.filter((e) => e.actors.includes(actor))
  }

  /** 事实 → 支持它的证据。 */
  evidenceForFact(fact: FactId): EvidenceId[] {
    return this.def.evidence.filter((ev) => ev.facts.includes(fact)).map((ev) => ev.id)
  }

  /** 事实 → 说出它的对白回答（任一角色任一话题）。 */
  responsesForFact(fact: FactId): Array<{ character: CharacterId; topic: string; response: string }> {
    const out: Array<{ character: CharacterId; topic: string; response: string }> = []
    for (const [character, topics] of Object.entries(this.def.topics)) {
      for (const t of topics) {
        for (const r of t.responses) {
          if (r.facts.includes(fact)) out.push({ character, topic: t.id, response: r.id })
        }
      }
    }
    return out
  }

  /** 事实是否可通过证据或证词获得（用于可达性 / 防死局校验）。 */
  factReachable(fact: FactId): boolean {
    return this.evidenceForFact(fact).length > 0 || this.responsesForFact(fact).length > 0
  }

  /** 时间线（按时间升序；无法解析的时间排末尾）。 */
  timeline(): TruthEvent[] {
    return [...this.def.truthEvents].sort((a, b) => toMin(a.time) - toMin(b.time))
  }

  /** 两条事实是否互斥（依据案件 contradictions 定义）。 */
  contradicts(a: FactId, b: FactId): boolean {
    const pairs = this.def.contradictions ?? []
    return pairs.some(
      ([x, y]) => (x === a && y === b) || (x === b && y === a)
    )
  }

  /** 全部互斥事实对。 */
  contradictionPairs(): Array<[FactId, FactId]> {
    return this.def.contradictions ?? []
  }

  /**
   * 可达性 / 逻辑闭合校验（内容测试用）。返回未达标项。
   * - 每个真相事件的事实都必须有获得路径（证据或证词）。
   * - acceptance 要求的证据与事实都必须可达。
   */
  unreachableFacts(): FactId[] {
    const need = new Set<FactId>()
    for (const f of this.allTruthFacts()) need.add(f)
    for (const f of this.def.acceptance.requiredFacts ?? []) need.add(f)
    for (const ev of this.def.acceptance.requiredEvidence ?? []) {
      for (const f of this.evidenceById(ev)?.facts ?? []) need.add(f)
    }
    const bad: FactId[] = []
    for (const f of need) if (!this.factReachable(f)) bad.push(f)
    return bad
  }

  evidenceById(id: EvidenceId) {
    return this.def.evidence.find((e) => e.id === id)
  }

  characterById(id: CharacterId) {
    return this.def.characters.find((c) => c.id === id)
  }

  topicsFor(character: CharacterId) {
    return this.def.topics[character] ?? []
  }
}

/** "03:02" -> 分钟数。 */
export function toMin(t: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim())
  if (!m) return Number.MAX_SAFE_INTEGER
  return Number(m[1]) * 60 + Number(m[2])
}

/** 两个时间差（分钟，绝对值）。 */
export function timeDiff(a: string, b: string): number {
  return Math.abs(toMin(a) - toMin(b))
}
