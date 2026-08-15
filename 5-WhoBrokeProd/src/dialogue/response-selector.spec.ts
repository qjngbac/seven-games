import { describe, it, expect } from 'vitest'
import { selectResponse } from './response-selector'
import { topicsWithState } from './topic-engine'
import { matchCond } from '../case-model/conditions'
import type { Topic } from '../case-model/types'
import type { InvestigationContext } from '../case-model/conditions'

const topic: Topic = {
  id: 't',
  subject: 's',
  ask: 'q',
  responses: [
    { id: 'fallback', priority: 10, facts: ['lie'], text: '我啥也不知道' },
    { id: 'truth', priority: 100, when: { presentedEvidence: ['git_log'] }, facts: ['truth'], text: '我承认' }
  ]
}

describe('response-selector', () => {
  const base: InvestigationContext = {
    discoveredFacts: [],
    presentedEvidence: {},
    askedTopics: {},
    trust: {}
  }

  it('无条件版本作为兜底被选中', () => {
    const r = selectResponse(topic, 'dev_A', base)
    expect(r.id).toBe('fallback')
  })

  it('出示证据后选高优先级真相连接', () => {
    const ctx: InvestigationContext = { ...base, presentedEvidence: { dev_A: ['git_log'] } }
    const r = selectResponse(topic, 'dev_A', ctx)
    expect(r.id).toBe('truth')
    expect(r.facts).toContain('truth')
  })

  it('优先级相同时取更高者', () => {
    const t2: Topic = {
      ...topic,
      responses: [
        { id: 'a', priority: 50, facts: [], text: 'a' },
        { id: 'b', priority: 80, facts: [], text: 'b' }
      ]
    }
    expect(selectResponse(t2, 'x', base).id).toBe('b')
  })
})

describe('topic-engine 解锁', () => {
  const lockedTopic: Topic = {
    id: 'secret',
    subject: 's',
    ask: 'q',
    unlock: { discoveredFacts: ['dev_A_force_push'] },
    responses: [{ id: 'r', priority: 1, facts: [], text: 'x' }]
  }
  it('未满足条件时锁定', () => {
    const states = topicsWithState({ characters: [], truthEvents: [], knowledge: [], evidence: [], topics: { dev_A: [lockedTopic] } } as any, 'dev_A', {
      discoveredFacts: [],
      presentedEvidence: {},
      askedTopics: {},
      trust: {}
    })
    expect(states[0].unlocked).toBe(false)
  })
  it('满足条件时解锁', () => {
    const states = topicsWithState({ characters: [], truthEvents: [], knowledge: [], evidence: [], topics: { dev_A: [lockedTopic] } } as any, 'dev_A', {
      discoveredFacts: ['dev_A_force_push'],
      presentedEvidence: {},
      askedTopics: {},
      trust: {}
    })
    expect(states[0].unlocked).toBe(true)
  })
  it('matchCond 组合条件', () => {
    const cond = { discoveredFacts: ['a'], presentedEvidence: ['e'], minTrust: 5 }
    expect(matchCond(cond, 'c', { discoveredFacts: ['a'], presentedEvidence: { c: ['e'] }, askedTopics: {}, trust: { c: 5 } })).toBe(true)
    expect(matchCond(cond, 'c', { discoveredFacts: ['a'], presentedEvidence: { c: [] }, askedTopics: {}, trust: { c: 5 } })).toBe(false)
    expect(matchCond(cond, 'c', { discoveredFacts: ['a'], presentedEvidence: { c: ['e'] }, askedTopics: {}, trust: { c: 3 } })).toBe(false)
  })
})
