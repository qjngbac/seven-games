// 工作日控制器：管理当天申请者队列、裁决判定与日结统计。
// 原则（设计文档 6.3）：DeskController 不实现字段比较（交给 RuleEvaluator），只编排流程与结算。
// 跨天累计状态（组织压力/良心/工资）由 store 持有，本类只产出当天增量。

import { ApplicantCase, CaseOutcome, DayResult, DayRules, Decision, EvalResult } from './types'
import { evaluate, isLegal } from './rules'
import { buildDayEvents } from './narrative'

export class DeskController {
  day: DayRules
  cases: ApplicantCase[]
  index = 0
  outcomes: CaseOutcome[] = []

  constructor(day: DayRules, cases: ApplicantCase[]) {
    this.day = day
    this.cases = cases
  }

  get current(): ApplicantCase | null {
    return this.index < this.cases.length ? this.cases[this.index] : null
  }

  get finished(): boolean {
    return this.index >= this.cases.length
  }

  evaluateCurrent(): EvalResult {
    const c = this.current
    if (!c) throw new Error('no current case')
    return evaluate(this.day.rules, c, this.day.today)
  }

  /** 作出裁决，返回结果并推进队列 */
  decide(decision: Decision): CaseOutcome {
    const c = this.current
    if (!c) throw new Error('no current case')
    const res = evaluate(this.day.rules, c, this.day.today)
    const legalCorrect = isLegal(res, decision)
    const isWrongAllow = c.expected === 'deny' && decision === 'allow'
    const isWrongDeny = c.expected === 'allow' && decision === 'deny'

    let penalty = 0
    let conscienceDelta = 0
    let orgDelta = 0

    if (isWrongAllow) {
      penalty = 50
      orgDelta = 15
      conscienceDelta = c.moral ? -5 : -3
    } else if (isWrongDeny) {
      penalty = 30
      orgDelta = 8
      conscienceDelta = c.moral ? -8 : -2
    } else if (decision === 'detain') {
      orgDelta = 2
      // 暂扣：对可怜的人算善意，对危险的人中性
      conscienceDelta = c.moral ? (c.moral.kindConscience === 'detain' ? 5 : 2) : 0
    } else {
      // 合法且正确（allow 或 deny）
      orgDelta = 0
      if (c.moral) {
        conscienceDelta = decision === 'allow' && c.moral.kindConscience === 'allow' ? 8 : decision === 'allow' ? 2 : 1
      } else {
        conscienceDelta = 1
      }
    }

    const outcome: CaseOutcome = {
      caseId: c.id,
      decision,
      expected: c.expected,
      legalCorrect,
      isWrongAllow,
      isWrongDeny,
      penalty,
      conscienceDelta,
      storyEffects: [...(c.storyTags || [])]
    }
    this.outcomes.push(outcome)
    this.index++
    return outcome
  }

  /** 当天日结 */
  dayResult(): DayResult {
    const processed = this.outcomes.length
    const correct = this.outcomes.filter((o) => o.legalCorrect).length
    const wrongAllow = this.outcomes.filter((o) => o.isWrongAllow).length
    const wrongDeny = this.outcomes.filter((o) => o.isWrongDeny).length
    const detainCount = this.outcomes.filter((o) => o.decision === 'detain').length
    const judged = correct + wrongAllow + wrongDeny
    const accuracy = judged === 0 ? 1 : correct / judged
    const salary = processed * 20 + (processed >= this.day.quota ? 50 : 0)
    const penalty = this.outcomes.reduce((s, o) => s + o.penalty, 0)
    const orgPressure = this.outcomes.reduce((s, o) => s + orgDeltaOf(o), 0)
    const conscience = this.outcomes.reduce((s, o) => s + o.conscienceDelta, 0)
    const events = buildDayEvents(this.outcomes)
    return {
      date: this.day.date,
      processed,
      correct,
      wrongAllow,
      wrongDeny,
      detainCount,
      accuracy,
      salary,
      penalty,
      net: salary - penalty,
      orgPressure,
      conscience,
      outcomes: this.outcomes,
      events
    }
  }
}

function orgDeltaOf(o: CaseOutcome): number {
  if (o.isWrongAllow) return 15
  if (o.isWrongDeny) return 8
  if (o.decision === 'detain') return 2
  return 0
}
