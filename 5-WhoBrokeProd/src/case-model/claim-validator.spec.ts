import { describe, it, expect } from 'vitest'
import { validateClaim, norm, actionMatches } from './claim-validator'
import { case1 } from '../data/cases/case1-force-push'

function baseClaim(over: Partial<Parameters<typeof validateClaim>[1]> = {}) {
  return {
    actors: ['dev_A', 'pm'],
    action: 'force_push',
    time: '03:02',
    motive: '为快速修复小 bug 绕过评审',
    evidence: ['git_log', 'chat_pm'],
    facts: ['dev_A_force_push', 'bypassed_review', 'pm_changed_req'],
    ...over
  }
}

describe('claim-validator', () => {
  it('完整指控 → success', () => {
    const v = validateClaim(case1, baseClaim(), ['dev_A_force_push', 'bypassed_review', 'pm_changed_req'])
    expect(v.outcome).toBe('success')
  })

  it('遗漏管理责任(pm) → partial', () => {
    const v = validateClaim(case1, baseClaim({ actors: ['dev_A'] }), [
      'dev_A_force_push',
      'bypassed_review',
      'pm_changed_req'
    ])
    expect(v.outcome).toBe('partial')
    expect(v.missingContributory).toContain('pm')
  })

  it('证据不足(只引一条) → partial', () => {
    const v = validateClaim(case1, baseClaim({ evidence: ['git_log'] }), [
      'dev_A_force_push',
      'bypassed_review',
      'pm_changed_req'
    ])
    expect(v.outcome).toBe('partial')
    expect(v.missingEvidence).toContain('chat_pm')
  })

  it('指认错误责任人(测试) → fail', () => {
    const v = validateClaim(case1, baseClaim({ actors: ['tester'] }), [
      'dev_A_force_push',
      'bypassed_review',
      'pm_changed_req'
    ])
    expect(v.outcome).toBe('fail')
    expect(v.missingResponsible).toContain('dev_A')
  })

  it('误指认无辜者 → fail', () => {
    const v = validateClaim(case1, baseClaim({ actors: ['dev_A', 'pm', 'tester'] }), [
      'dev_A_force_push',
      'bypassed_review',
      'pm_changed_req'
    ])
    expect(v.outcome).toBe('fail')
    expect(v.wrongActors).toContain('tester')
  })

  it('行为等价表述(强制推送) → success', () => {
    const v = validateClaim(case1, baseClaim({ action: '强制推送' }), [
      'dev_A_force_push',
      'bypassed_review',
      'pm_changed_req'
    ])
    expect(v.outcome).toBe('success')
  })

  it('行为错误 → partial', () => {
    const v = validateClaim(case1, baseClaim({ action: 'build_failed' }), [
      'dev_A_force_push',
      'bypassed_review',
      'pm_changed_req'
    ])
    expect(v.outcome).toBe('partial')
  })

  it('时间在容差内算对，超出则 partial', () => {
    expect(
      validateClaim(case1, baseClaim({ time: '03:06' }), ['dev_A_force_push', 'bypassed_review', 'pm_changed_req']).outcome
    ).toBe('success')
    expect(
      validateClaim(case1, baseClaim({ time: '03:30' }), ['dev_A_force_push', 'bypassed_review', 'pm_changed_req']).outcome
    ).toBe('partial')
  })

  it('norm 归一化等价比对', () => {
    expect(norm('强制推送')).toBe(norm('强 制 推 送'))
    expect(actionMatches('强制推送', 'force_push', ['强制推送', '强推'])).toBe(true)
    expect(actionMatches('强推', 'force_push', ['强推'])).toBe(true)
    expect(actionMatches('乱填', 'force_push', [])).toBe(false)
  })
})
