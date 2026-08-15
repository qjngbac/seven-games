import { describe, it, expect } from 'vitest'
import { CASES, caseById } from './cases'
import { TruthGraph } from '../case-model/truth-graph'
import { validateClaim, norm } from '../case-model/claim-validator'
import { matchCond } from '../case-model/conditions'
import { selectResponse } from '../dialogue/response-selector'
import type { CaseDef, FactId } from '../case-model/types'

/** 收集案件中引用的全部事实 id（用于可达性强校验）。 */
function allReferencedFacts(c: CaseDef): FactId[] {
  const set = new Set<FactId>()
  for (const e of c.truthEvents) for (const f of e.facts) set.add(f)
  for (const ev of c.evidence) for (const f of ev.facts) set.add(f)
  for (const k of c.knowledge) for (const f of [...k.observed, ...k.heard, ...k.beliefs, ...k.secrets]) set.add(f)
  for (const [a, b] of c.contradictions ?? []) {
    set.add(a)
    set.add(b)
  }
  for (const [a, b] of c.supports ?? []) {
    set.add(a)
    set.add(b)
  }
  for (const topics of Object.values(c.topics)) {
    for (const t of topics) for (const r of t.responses) for (const f of r.facts) set.add(f)
  }
  return [...set]
}

/**
 * 模拟一次"完整调查"：检视全部证据，并对每个角色就每个话题分别在不出示 / 出示全部证据两种
 * 情形下提问，收集能发现的所有事实。这对应玩家真实可执行的玩法序列（先问后出示再追问）。
 */
function investigate(c: CaseDef): Set<FactId> {
  const discovered = new Set<FactId>()
  const allEvidence = c.evidence.map((e) => e.id)
  const ctxFor = (present: string[]) => ({
    discoveredFacts: [...discovered],
    presentedEvidence: { __dummy: present } as Record<string, string[]>,
    askedTopics: {} as Record<string, string[]>,
    trust: {} as Record<string, number>
  })
  // 检视全部证据
  for (const ev of c.evidence) for (const f of ev.facts) discovered.add(f)
  for (const ch of c.characters) {
    const topics = c.topics[ch.id] ?? []
    for (const present of [[], allEvidence]) {
      const ctx = ctxFor(present)
      // 修正 presentedEvidence 键为当前角色
      ctx.presentedEvidence = { [ch.id]: present }
      for (const t of topics) {
        if (!matchCond(t.unlock, ch.id, ctx)) continue
        const res = selectResponse(t, ch.id, ctx)
        for (const f of res.facts) discovered.add(f)
        for (const evId of res.revealsEvidence ?? []) {
          const ev = c.evidence.find((e) => e.id === evId)
          if (ev) for (const f of ev.facts) discovered.add(f)
        }
      }
    }
  }
  return discovered
}

function canonicalTime(c: CaseDef): string {
  const ev = c.truthEvents.find((e) => norm(e.action) === norm(c.acceptance.action))
  return ev?.time ?? ''
}

describe('内容完整性：4 个案件均逻辑闭合且可解', () => {
  it('共 7 个案件，按章节排序', () => {
    expect(CASES.length).toBe(7)
    for (let i = 1; i < CASES.length; i++) {
      expect(CASES[i].chapter).toBeGreaterThan(CASES[i - 1].chapter)
    }
  })

  for (const c of CASES) {
    describe(`案件《${c.title}》`, () => {
      const tg = new TruthGraph(c)
      const charIds = c.characters.map((x) => x.id)

      it('责任人 / 管理责任均为真实角色', () => {
        for (const a of c.acceptance.responsible) expect(charIds).toContain(a)
        for (const a of c.acceptance.contributory ?? []) expect(charIds).toContain(a)
      })

      it('requiredEvidence 均为真实证据', () => {
        for (const e of c.acceptance.requiredEvidence ?? []) {
          expect(c.evidence.map((x) => x.id)).toContain(e)
        }
      })

      it('每个角色至少有一个话题', () => {
        for (const ch of c.characters) {
          expect((c.topics[ch.id] ?? []).length).toBeGreaterThan(0)
        }
      })

      it('每个话题至少有一个无条件的兜底回答（不会死局）', () => {
        for (const topics of Object.values(c.topics)) {
          for (const t of topics) {
            expect(t.responses.some((r) => !r.when)).toBe(true)
          }
        }
      })

      it('所有被引用的关键事实都有获得路径（证据或证词）', () => {
        const bad = allReferencedFacts(c).filter((f) => !tg.factReachable(f))
        expect(bad).toEqual([])
      })

      it('真相图无不可达事实（truth/received/required 全可达）', () => {
        expect(tg.unreachableFacts()).toEqual([])
      })

      it('矛盾对引用的都是真实事实', () => {
        const allFacts = allReferencedFacts(c)
        for (const [a, b] of c.contradictions ?? []) {
          expect(allFacts).toContain(a)
          expect(allFacts).toContain(b)
        }
      })

      it('仅检视证据即可拿到全部 requiredFacts（关键证据永不被锁死）', () => {
        const disc = new Set<FactId>()
        for (const ev of c.evidence) for (const f of ev.facts) disc.add(f)
        for (const f of c.acceptance.requiredFacts ?? []) {
          expect(disc.has(f)).toBe(true)
        }
      })

      it('完整调查后所有矛盾对均可被发现（推理板可识别谎言）', () => {
        const disc = investigate(c)
        for (const [a, b] of c.contradictions ?? []) {
          expect(disc.has(a) && disc.has(b)).toBe(true)
        }
      })

      it('存在一条完成路径：正确指控 → success（无永久锁死）', () => {
        const disc = investigate(c)
        const actors = [...c.acceptance.responsible, ...(c.acceptance.contributory ?? [])]
        const claim = {
          actors,
          action: c.acceptance.action,
          time: canonicalTime(c),
          motive: '根据证据与证词还原的事件链',
          evidence: c.acceptance.requiredEvidence ?? [],
          facts: [...disc]
        }
        const v = validateClaim(c, claim, [...disc])
        if (v.outcome !== 'success') {
          // eslint-disable-next-line no-console
          console.log('DEBUG', c.id, v.outcome, JSON.stringify({ missingResponsible: v.missingResponsible, wrongActors: v.wrongActors, missingEvidence: v.missingEvidence, missingFacts: v.missingFacts, missingContributory: v.missingContributory, time: claim.time }))
        }
        expect(v.outcome).toBe('success')
      })
    })
  }
})

describe('caseById 索引', () => {
  it('按 id 取到案件', () => {
    expect(caseById('force-push')?.title).toBe('凌晨的强制推送')
    expect(caseById('nope')).toBeUndefined()
  })
})
