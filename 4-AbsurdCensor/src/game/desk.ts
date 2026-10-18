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

    const isWrongAllow = c.expected !== 'allow' && decision === 'allow'
    const isWrongDeny = (c.expected === 'allow' && decision === 'deny') || (c.expected === 'detain' && decision === 'deny')
    const isWrongDetain = c.expected !== 'detain' && decision === 'detain'
    const isCorrectDetain = c.expected === 'detain' && decision === 'detain'

    let penalty = 0
    let conscienceDelta = 0

    if (isCorrectDetain) {
      // 成功扣押通缉犯/假证/违禁分子：立功表现
      conscienceDelta = 3
    } else if (isWrongAllow) {
      penalty = c.expected === 'detain' ? 70 : 50
      conscienceDelta = c.moral ? -5 : -3
    } else if (isWrongDeny) {
      if (c.expected === 'detain') {
        // 放跑了通缉犯或伪造分子
        penalty = 50
        conscienceDelta = -4
      } else {
        penalty = 30
        conscienceDelta = c.moral ? -8 : -2
      }
    } else if (isWrongDetain) {
      if (c.expected === 'allow') {
        // 无故扣押合法公民：严重滥权
        penalty = 30
        conscienceDelta = -6
      } else {
        // 对材料不齐的普通违规人员过度执法：小额警告
        penalty = 10
        conscienceDelta = -1
      }
    } else {
      // 合法且正确（allow 或 deny）
      if (c.moral) {
        conscienceDelta = decision === 'allow' && c.moral.kindConscience === 'allow' ? 8 : decision === 'allow' ? 2 : 1
      } else {
        conscienceDelta = 1
      }
    }

    const outcome: CaseOutcome = {
      caseId: c.id,
      applicantName: c.name,
      decision,
      expected: c.expected,
      legalCorrect,
      isWrongAllow,
      isWrongDeny,
      isWrongDetain,
      isCorrectDetain,
      penalty,
      conscienceDelta,
      storyEffects: [...(c.storyTags || [])],
      truth: c.truth
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
    const judged = processed
    const accuracy = judged === 0 ? 0 : correct / judged
    // 薪资计算：基本津贴 + 满额奖金 + 成功扣押嫌疑人奖金
    const salary = processed * 20 + (processed >= this.day.quota ? 50 : 0) + this.outcomes.filter((o) => o.isCorrectDetain).length * 30
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
      judged,
      accuracy,
      salary,
      penalty,
      net: Math.max(0, salary - penalty),
      orgPressure,
      conscience,
      outcomes: this.outcomes,
      events
    }
  }
}

function orgDeltaOf(o: CaseOutcome): number {
  if (o.isCorrectDetain) return 0
  if (o.isWrongAllow) return o.expected === 'detain' ? 20 : 15
  if (o.isWrongDeny) return o.expected === 'detain' ? 12 : 8
  if (o.isWrongDetain) return o.expected === 'allow' ? 6 : 2
  return 0
}
