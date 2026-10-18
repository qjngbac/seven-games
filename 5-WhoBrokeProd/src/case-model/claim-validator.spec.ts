import { describe, it, expect } from 'vitest'
import { validateClaim, norm, actionMatches, toMin } from './claim-validator'
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

describe('多责任人案件（共同责任）：分别指认应给 partial 而不是直接 fail', () => {
  it('case4 只指认其中一人 → partial，并提示遗漏的共同责任人', async () => {
    const { case4 } = await import('../data/cases/case4-cascade')
    const v = validateClaim(
      case4,
      {
        actors: ['oncall_feng'],
        action: '调短超时并叠加重试',
        time: '22:00',
        motive: '',
        evidence: ['gateway_cfg', 'pay_deploy'],
        facts: ['timeout_tightened', 'retry_storm', 'cascade_outage']
      },
      ['timeout_tightened', 'retry_storm', 'cascade_outage']
    )
    expect(v.outcome).toBe('partial')
    expect(v.missingResponsible).toContain('pay_lead_zhen')
    expect(v.message).toContain('部分责任人')
  })

  it('case4 一个主责任人都没指认到（只指认无关者）→ fail', async () => {
    const { case4 } = await import('../data/cases/case4-cascade')
    const v = validateClaim(
      case4,
      { actors: ['oncall_small_change'], action: '', time: '', motive: '', evidence: [], facts: [] },
      []
    )
    expect(v.outcome).toBe('fail')
  })
})

describe('多责任人案件（共同责任）：分别指认应给 partial 而不是直接 fail', () => {
  it('case4 只指认其中一人 → partial，并提示遗漏的共同责任人', async () => {
    const { case4 } = await import('../data/cases/case4-cascade')
    const v = validateClaim(
      case4,
      {
        actors: ['oncall_feng'],
        action: '调短超时并叠加重试',
        time: '22:00',
        motive: '',
        evidence: ['gateway_cfg', 'pay_deploy'],
        facts: ['timeout_tightened', 'retry_storm', 'cascade_outage']
      },
      ['timeout_tightened', 'retry_storm', 'cascade_outage']
    )
    expect(v.outcome).toBe('partial')
    expect(v.missingResponsible).toContain('pay_lead_zhen')
    expect(v.message).toContain('部分责任人')
  })

  it('case4 一个主责任人都没指认到（只指认无关者）→ fail', async () => {
    const { case4 } = await import('../data/cases/case4-cascade')
    const v = validateClaim(
      case4,
      { actors: ['oncall_small_change'], action: '', time: '', motive: '', evidence: [], facts: [] },
      []
    )
    expect(v.outcome).toBe('fail')
  })
})

describe('时间格式兼容与容差测试', () => {
  it('toMin 支持多种输入格式', () => {
    expect(toMin('03:02')).toBe(182)
    expect(toMin('03：02')).toBe(182)
    expect(toMin('3点02分')).toBe(182)
  })

  it('全角冒号与中文时间格式通过校验', () => {
    // 正常 03:02 成功
    const v1 = validateClaim(case1, baseClaim({ time: '03:02' }), ['dev_A_force_push', 'bypassed_review', 'pm_changed_req'])
    expect(v1.outcome).toBe('success')

    // 全角冒号 03：02 也应成功
    const v2 = validateClaim(case1, baseClaim({ time: '03：02' }), ['dev_A_force_push', 'bypassed_review', 'pm_changed_req'])
    expect(v2.outcome).toBe('success')

    // 中文时间 03点02分 也应成功
    const v3 = validateClaim(case1, baseClaim({ time: '03点02分' }), ['dev_A_force_push', 'bypassed_review', 'pm_changed_req'])
    expect(v3.outcome).toBe('success')
  })
})

describe('动作中文化与选项审计测试', () => {
  it('指控时使用规范中文动作（含括号术语）同样判定 success', () => {
    const v = validateClaim(case1, baseClaim({ action: '向主干强制推送（force push）' }), [
      'dev_A_force_push',
      'bypassed_review',
      'pm_changed_req'
    ])
    expect(v.outcome).toBe('success')
  })

  it('错误提示信息中必须将底层代码 ID 转化为人类可读中文名称', () => {
    // 遗漏主责任人
    const v1 = validateClaim(case1, baseClaim({ actors: ['ops'] }), [
      'dev_A_force_push',
      'bypassed_review',
      'pm_changed_req'
    ])
    expect(v1.message).toContain('阿杰')
    expect(v1.message).not.toContain('dev_A')

    // 误指认无辜者
    const v2 = validateClaim(case1, baseClaim({ actors: ['dev_A', 'pm', 'tester'] }), [
      'dev_A_force_push',
      'bypassed_review',
      'pm_changed_req'
    ])
    expect(v2.message).toContain('小琳')
    expect(v2.message).not.toContain('tester')

    // 缺少关键证据与关键事实
    const v3 = validateClaim(case1, baseClaim({ evidence: [], facts: [] }), [])
    expect(v3.message).toContain('Git 服务器日志')
    expect(v3.message).not.toContain('git_log')
  })

  it('canonicalTimeForAction 支持按中文选项或别名自动推导案发时间', async () => {
    const { canonicalTimeForAction } = await import('./claim-validator')
    expect(canonicalTimeForAction(case1, 'force_push')).toBe('03:02')
    expect(canonicalTimeForAction(case1, '向主干强制推送（force push）')).toBe('03:02')
    expect(canonicalTimeForAction(case1, '强制推送')).toBe('03:02')
    expect(canonicalTimeForAction(case1, '临时紧急变更需求')).toBe('01:50')
  })

  it('所有 7 个案件的 getActionOptionsForCase 均提供 6 个结构化无重复中文选项', async () => {
    const { CASES } = await import('../data/cases')
    const { getActionOptionsForCase } = await import('./actions')

    for (const c of CASES) {
      const options = getActionOptionsForCase(c)
      expect(options.length).toBe(6)

      // 必须无任何重复标签
      const labels = options.map((o) => o.label)
      expect(new Set(labels).size).toBe(6)

      // 必须恰好包含 1 个非 decoy 的正确选项
      const nonDecoys = options.filter((o) => !o.isDecoy)
      expect(nonDecoys.length).toBe(1)
      expect(nonDecoys[0].value).toBe(c.acceptance.action)

      // 选项中不允许出现生硬内部变量名
      for (const opt of options) {
        expect(opt.label).not.toMatch(/dev_A|dev_qiang|intern_wu|dev_nan|oncall_feng|build_failed|force_push/)
      }
    }
  })
})
